"use client";
import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { renderMarkdown, renderMermaid } from "./markdown";

export function MarkdownView({ source, className }: { source: string; className?: string }) {
  const [html, setHtml] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const uid = useId().replace(/:/g, "");
  useEffect(() => {
    let live = true;
    void renderMarkdown(source).then((h) => live && setHtml(h)).catch(() => live && setHtml("<p>Could not render this note.</p>"));
    return () => { live = false; };
  }, [source]);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    root.querySelectorAll<HTMLElement>("pre > code.language-mermaid").forEach((code, i) => {
      const pre = code.parentElement as HTMLElement;
      const host = document.createElement("div");
      host.className = "my-3 overflow-x-auto rounded-2xl bg-white p-3";
      pre.replaceWith(host);
      renderMermaid(host, code.textContent ?? "", `m${uid}${i}`).catch(() => { host.textContent = "Mermaid diagram has a syntax error."; });
    });
  }, [html, uid]);
  return <div ref={ref} className={cn("prose-sq", className)} dangerouslySetInnerHTML={{ __html: html }} />;
}
