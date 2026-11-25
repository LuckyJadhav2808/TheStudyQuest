import { mergeAttributes, Node } from "@tiptap/core";

export type CalloutKind = "note" | "tip" | "important" | "warning" | "caution";

export const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "block+",
  defining: true,

  addAttributes() {
    return {
      kind: {
        default: "note",
        parseHTML: (el) => (el.getAttribute("data-callout") as CalloutKind) || "note",
        renderHTML: (attrs) => ({ "data-callout": attrs.kind }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div.callout[data-callout]" }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const kind = String(node.attrs.kind || "note").toLowerCase();
    return [
      "div",
      mergeAttributes(HTMLAttributes, { class: `callout callout-${kind}` }),
      ["div", { class: "callout-title", contenteditable: "false" }, kind.toUpperCase()],
      ["div", { class: "callout-body" }, 0],
    ];
  },
});
