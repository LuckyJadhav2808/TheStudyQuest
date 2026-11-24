import { RouteShell } from "@/components/shell/RouteShell";
import { MlPage } from "@/features/ml/MlPage";

export default function Page() {
  return <RouteShell flag="ml"><MlPage /></RouteShell>;
}
