import { Extension } from "@tiptap/core";
import type { Node as PMNode } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { getCachedSpellchecker, getSpellchecker, type SpellChecker } from "@/lib/spellcheck";

export const SPELLCHECK_META = "spellcheck-refresh";
const spellKey = new PluginKey<DecorationSet>("nspellCheck");
const WORD_RE = /\b[A-Za-z][A-Za-z']{2,}\b/g;

function shouldSkipWord(word: string): boolean {
  if (/^[A-Z0-9]+$/.test(word)) return true; // Acronyms like API, CPU, HTML
  if (/[a-z][A-Z]/.test(word)) return true; // camelCase identifiers
  return false;
}

function buildDecorations(doc: PMNode, checker: SpellChecker | null): DecorationSet {
  if (!checker) return DecorationSet.empty;
  const decs: Decoration[] = [];
  doc.descendants((node, pos) => {
    if (node.type.name === "codeBlock" || node.type.name === "inlineMath" || node.type.name === "blockMath") {
      return false;
    }
    if (!node.isText || !node.text) return true;
    if (node.marks.some((m) => m.type.name === "code" || m.type.name === "link")) return true;

    WORD_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = WORD_RE.exec(node.text)) !== null) {
      const word = m[0];
      if (shouldSkipWord(word)) continue;
      if (!checker.correct(word)) {
        const from = pos + m.index;
        const to = from + word.length;
        decs.push(
          Decoration.inline(from, to, {
            class: "sq-spell-error",
            "data-spell-word": word,
            "data-spell-from": String(from),
            "data-spell-to": String(to),
          })
        );
      }
    }
    return true;
  });
  return DecorationSet.create(doc, decs);
}

export const SpellcheckExtension = Extension.create({
  name: "nspellCheck",
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: spellKey,
        state: {
          init: (_cfg, state) => buildDecorations(state.doc, getCachedSpellchecker()),
          apply: (tr, old) => {
            if (tr.docChanged || tr.getMeta(SPELLCHECK_META)) {
              return buildDecorations(tr.doc, getCachedSpellchecker());
            }
            return old;
          },
        },
        view: (editorView) => {
          let active = true;
          if (!getCachedSpellchecker()) {
            void getSpellchecker().then(() => {
              if (active && !editorView.isDestroyed) {
                editorView.dispatch(editorView.state.tr.setMeta(SPELLCHECK_META, true));
              }
            });
          }
          return {
            destroy: () => {
              active = false;
            },
          };
        },
        props: {
          decorations: (state) => spellKey.getState(state),
        },
      }),
    ];
  },
});
