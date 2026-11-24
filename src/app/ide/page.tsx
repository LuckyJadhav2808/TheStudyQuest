import { RouteShell } from "@/components/shell/RouteShell";
import { IdePage } from "@/features/code/IdePage";

export default function Page() {
  return <RouteShell flag="ide"><IdePage /></RouteShell>;
}
