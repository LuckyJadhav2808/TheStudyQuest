import { RouteShell } from "@/components/shell/RouteShell";
import { AdminPage } from "@/features/admin/AdminPage";

export default function Page() {
  return <RouteShell flag="admin"><AdminPage /></RouteShell>;
}
