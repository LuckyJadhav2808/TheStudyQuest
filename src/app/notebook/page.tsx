import { RouteShell } from "@/components/shell/RouteShell";
import { NotebookPage } from "@/features/notebook/NotebookPage";

export default function Page() {
  return <RouteShell flag="notebook"><NotebookPage /></RouteShell>;
}
