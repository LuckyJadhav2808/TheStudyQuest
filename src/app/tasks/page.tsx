import { RouteShell } from "@/components/shell/RouteShell";
import { TasksPage } from "@/features/tasks/TasksPage";

export default function Page() {
  return <RouteShell><TasksPage /></RouteShell>;
}
