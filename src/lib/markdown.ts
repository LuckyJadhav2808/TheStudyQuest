import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeSlug from "rehype-slug";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified, type Plugin } from "unified";

interface MNode { type: string; value?: string; children?: MNode[]; data?: Record<string, unknown> }
const KINDS = ["NOTE", "TIP", "IMPORTANT", "WARNING", "CAUTION"];

/** Turns `> [!NOTE]` blockquotes into styled callout divs. */
function callouts() {
  const walk = (n: MNode) => {
    if (n.type === "blockquote" && n.children?.[0]?.type === "paragraph") {
      const first = n.children[0].children?.[0];
      const m = first?.type === "text" ? /^\s*\[!(\w+)\]\s*/.exec(first.value ?? "") : null;
      if (first && m && KINDS.includes(m[1].toUpperCase())) {
        const kind = m[1].toUpperCase();
        first.value = (first.value ?? "").slice(m[0].length);
        n.data = { hName: "div", hProperties: { className: ["callout", `callout-${kind.toLowerCase()}`] } };
        n.children.unshift({ type: "paragraph", data: { hName: "div", hProperties: { className: ["callout-title"] } }, children: [{ type: "text", value: kind }] });
      }
    }
    n.children?.forEach(walk);
  };
  return (tree: MNode) => walk(tree);
}
const schema = {
  ...defaultSchema,
  attributes: { ...defaultSchema.attributes, "*": [...(defaultSchema.attributes?.["*"] ?? []), "className"] },
  protocols: { ...defaultSchema.protocols, src: [...(defaultSchema.protocols?.src ?? []), "data"] },
};

export async function renderMarkdown(md: string): Promise<string> {
  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkMath)
    .use(callouts as unknown as Plugin)
    .use(remarkRehype)
    .use(rehypeSanitize, schema)
    .use(rehypeSlug)
    .use(rehypeKatex)
    .use(rehypeHighlight, { detect: false, ignoreMissing: true })
    .use(rehypeStringify)
    .process(md);
  return String(file);
}
export function mdToText(md: string): string {
  return md.replace(/```[\s\S]*?```/g, "").replace(/[#>*_`~\[\]()$-]/g, "").replace(/\n{2,}/g, "\n\n").trim();
}
export async function renderMermaid(svgHost: HTMLElement, code: string, id: string): Promise<void> {
  const mermaid = (await import("mermaid")).default;
  mermaid.initialize({ startOnLoad: false, securityLevel: "strict", theme: "neutral" });
  const { svg } = await mermaid.render(id, code);
  svgHost.innerHTML = svg;
}
