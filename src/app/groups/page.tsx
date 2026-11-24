import { RouteShell } from "@/components/shell/RouteShell";
import { GroupsPage } from "@/features/groups/GroupsPage";

export default function Page() {
  return <RouteShell flag="groups"><GroupsPage /></RouteShell>;
}
