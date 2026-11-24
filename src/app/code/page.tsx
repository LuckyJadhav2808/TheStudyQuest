import { RouteShell } from "@/components/shell/RouteShell";
import { CodePage } from "@/features/code/CodePage";

export default function Page() {
  return <RouteShell flag="code"><CodePage /></RouteShell>;
}
