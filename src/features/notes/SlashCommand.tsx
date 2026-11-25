"use client";
import { Extension } from "@tiptap/core";
import { ReactRenderer } from "@tiptap/react";
import Suggestion, { type SuggestionKeyDownProps, type SuggestionProps } from "@tiptap/suggestion";
import MiniSearch from "minisearch";
import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { SLASH_ITEMS, type SlashItem } from "./autocompleteDataset";

const slashSearch = new MiniSearch<{ id: string; title: string; subtitle: string; category: string; keywordsText: string }>({
  fields: ["title", "subtitle", "category", "keywordsText"],
  storeFields: ["id"],
  searchOptions: { prefix: true, fuzzy: 0.25, boost: { title: 2, keywordsText: 1.5 } },
});
slashSearch.addAll(
  SLASH_ITEMS.map((item) => ({
    id: item.id,
    title: item.title,
    subtitle: item.subtitle,
    category: item.category,
    keywordsText: item.keywords.join(" "),
  }))
);
const SLASH_BY_ID = new Map(SLASH_ITEMS.map((item) => [item.id, item]));

interface SlashListHandle {
  onKeyDown: (props: SuggestionKeyDownProps) => boolean;
}

const SlashMenuList = forwardRef<SlashListHandle, SuggestionProps<SlashItem>>(function SlashMenuList(props, ref) {
  const [selected, setSelected] = useState(0);
  const items = props.items;
  const activeIdx = items.length ? Math.min(selected, items.length - 1) : 0;

  useEffect(() => {
    setSelected(0);
  }, [items]);

  const selectItem = (index: number) => {
    const item = items[index];
    if (item) props.command(item);
  };

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === "ArrowUp") {
        setSelected((s) => (s + items.length - 1) % Math.max(1, items.length));
        return true;
      }
      if (event.key === "ArrowDown") {
        setSelected((s) => (s + 1) % Math.max(1, items.length));
        return true;
      }
      if (event.key === "Enter") {
        selectItem(activeIdx);
        return true;
      }
      return false;
    },
  }));

  if (items.length === 0) {
    return (
      <div className="w-64 rounded-2xl border-[1.5px] border-border-strong bg-surface-inverse p-3 text-xs text-on-inverse shadow-xl">
        No matching block or formula.
      </div>
    );
  }

  return (
    <div
      role="listbox"
      aria-label="Slash commands and formulas"
      className="w-72 max-h-72 overflow-y-auto scroll-thin rounded-2xl border-[1.5px] border-border-strong bg-surface-inverse p-1.5 text-on-inverse shadow-xl"
    >
      {items.map((item, index) => {
        const active = index === activeIdx;
        return (
          <button
            key={item.id}
            type="button"
            role="option"
            aria-selected={active}
            onMouseDown={(e) => {
              e.preventDefault();
              selectItem(index);
            }}
            onMouseEnter={() => setSelected(index)}
            className={`flex w-full items-center justify-between gap-2 rounded-xl px-2.5 py-1.5 text-left transition ${
              active ? "bg-primary text-on-primary" : "hover:bg-surface/10"
            }`}
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-extrabold">{item.title}</p>
              <p className={`truncate text-[10px] ${active ? "text-on-primary/80" : "opacity-70"}`}>{item.subtitle}</p>
            </div>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider ${
                active ? "bg-surface-inverse text-on-inverse" : "bg-surface/15 text-on-inverse"
              }`}
            >
              {item.category}
            </span>
          </button>
        );
      })}
    </div>
  );
});

export function createSlashCommandExtension(openMermaid: () => void) {
  return Extension.create({
    name: "slashCommand",
    addOptions() {
      return {
        suggestion: {
          char: "/",
          startOfLine: false,
          items: ({ query }: { query: string }) => {
            const q = query.trim().toLowerCase();
            if (!q) return SLASH_ITEMS.slice(0, 10);
            const fuzzyIds = slashSearch.search(q).map((r) => SLASH_BY_ID.get(String(r.id))).filter((x): x is SlashItem => Boolean(x));
            if (fuzzyIds.length > 0) return fuzzyIds.slice(0, 10);
            return SLASH_ITEMS.filter(
              (item) =>
                item.title.toLowerCase().includes(q) ||
                item.category.toLowerCase().includes(q) ||
                item.keywords.some((k) => k.includes(q))
            ).slice(0, 10);
          },
          command: ({ editor, range, props }: { editor: Parameters<SlashItem["command"]>[0]["editor"]; range: Parameters<SlashItem["command"]>[0]["range"]; props: SlashItem }) => {
            props.command({ editor, range, openMermaid });
          },
          render: () => {
            let renderer: ReactRenderer<SlashListHandle> | null = null;
            let host: HTMLDivElement | null = null;

            const position = (props: SuggestionProps<SlashItem>) => {
              if (!host) return;
              const rect = props.clientRect?.();
              if (!rect) return;
              const top = Math.min(window.innerHeight - 300, rect.bottom + 6);
              const left = Math.min(window.innerWidth - 300, Math.max(12, rect.left));
              host.style.top = `${top}px`;
              host.style.left = `${left}px`;
            };

            return {
              onStart: (props: SuggestionProps<SlashItem>) => {
                host = document.createElement("div");
                host.style.position = "fixed";
                host.style.zIndex = "80";
                document.body.appendChild(host);
                renderer = new ReactRenderer(SlashMenuList, {
                  props,
                  editor: props.editor,
                });
                host.appendChild(renderer.element);
                position(props);
              },
              onUpdate: (props: SuggestionProps<SlashItem>) => {
                renderer?.updateProps(props);
                position(props);
              },
              onKeyDown: (props: SuggestionKeyDownProps) => {
                if (props.event.key === "Escape") {
                  host?.remove();
                  renderer?.destroy();
                  host = null;
                  renderer = null;
                  return true;
                }
                return renderer?.ref?.onKeyDown(props) ?? false;
              },
              onExit: () => {
                host?.remove();
                renderer?.destroy();
                host = null;
                renderer = null;
              },
            };
          },
        },
      };
    },
    addProseMirrorPlugins() {
      return [
        Suggestion({
          editor: this.editor,
          ...this.options.suggestion,
        }),
      ];
    },
  });
}
