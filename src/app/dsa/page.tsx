import { RouteShell } from "@/components/shell/RouteShell";
import { DsaPage } from "@/features/dsa/DsaPage";

export default function Page() {
  return <RouteShell flag="dsa"><DsaPage /></RouteShell>;
}
