import { RouteShell } from "@/components/shell/RouteShell";
import { WhiteboardPage } from "@/features/whiteboard/WhiteboardPage";

export default function Page() {
  return <RouteShell flag="whiteboard"><WhiteboardPage /></RouteShell>;
}
