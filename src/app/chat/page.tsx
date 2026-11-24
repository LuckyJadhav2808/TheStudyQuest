import { RouteShell } from "@/components/shell/RouteShell";
import { ChatPage } from "@/features/chat/ChatPage";

export default function Page() {
  return <RouteShell><ChatPage /></RouteShell>;
}
