import type { NbCell, NbOutput, Notebook } from "@/core/types";
import { uid } from "@/lib/utils";

interface RawCell { cell_type: string; source: string | string[]; outputs?: RawOut[]; execution_count?: number | null; metadata?: object }
interface RawOut { output_type: string; name?: string; text?: string | string[]; data?: Record<string, string | string[]>; ename?: string; evalue?: string; traceback?: string[] }
const join = (s: string | string[] | undefined): string => (Array.isArray(s) ? s.join("") : s ?? "");

export function toIpynb(nb: Notebook): string {
  const cells = nb.cells.map((c) => c.type === "markdown"
    ? { cell_type: "markdown", metadata: {}, source: c.source }
    : { cell_type: "code", metadata: {}, execution_count: c.count ?? null, source: c.source, outputs: c.outputs.map((o) => {
        if (o.kind === "image") return { output_type: "display_data", metadata: {}, data: { "image/png": o.data ?? "" } };
        if (o.kind === "error") return { output_type: "error", ename: "Error", evalue: o.text ?? "", traceback: (o.text ?? "").split("\n") };
        if (o.kind === "result") return { output_type: "execute_result", execution_count: c.count ?? null, metadata: {}, data: { "text/plain": o.text ?? "" } };
        return { output_type: "stream", name: o.kind, text: o.text ?? "" };
      }) });
  return JSON.stringify({ nbformat: 4, nbformat_minor: 5, metadata: { kernelspec: { name: "python3", display_name: "Python 3", language: "python" }, language_info: { name: "python" } }, cells }, null, 1);
}
export function fromIpynb(text: string, name: string): Omit<Notebook, "id" | "createdAt" | "updatedAt"> {
  const j = JSON.parse(text) as { cells?: RawCell[] };
  const cells: NbCell[] = (j.cells ?? []).filter((c) => c.cell_type === "code" || c.cell_type === "markdown").map((c) => ({
    id: uid(), type: c.cell_type as "code" | "markdown", source: join(c.source), count: c.execution_count ?? null,
    outputs: (c.outputs ?? []).flatMap((o): NbOutput[] => {
      if (o.output_type === "stream") return [{ kind: o.name === "stderr" ? "stderr" : "stdout", text: join(o.text) }];
      if (o.output_type === "error") return [{ kind: "error", text: `${o.ename}: ${o.evalue}\n${(o.traceback ?? []).join("\n")}` }];
      const img = o.data?.["image/png"];
      if (img) return [{ kind: "image", data: join(img).replace(/\n/g, "") }];
      const t = o.data?.["text/plain"];
      return t ? [{ kind: "result", text: join(t) }] : [];
    }),
  }));
  return { name: name.replace(/\.ipynb$/i, ""), cells };
}
