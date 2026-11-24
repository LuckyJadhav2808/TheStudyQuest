import { RouteShell } from "@/components/shell/RouteShell";
import { TrackerPage } from "@/features/tracker/TrackerPage";

export default function Page() {
  return <RouteShell flag="tracker"><TrackerPage /></RouteShell>;
}
