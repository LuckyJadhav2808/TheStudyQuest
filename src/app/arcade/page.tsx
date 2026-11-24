import { RouteShell } from "@/components/shell/RouteShell";
import { ArcadePage } from "@/features/arcade/ArcadePage";

export default function Page() {
  return <RouteShell flag="arcade"><ArcadePage /></RouteShell>;
}
