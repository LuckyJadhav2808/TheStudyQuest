import { RouteShell } from "@/components/shell/RouteShell";
import { AlchemyPage } from "@/features/alchemy/AlchemyPage";

export default function Page() {
  return <RouteShell flag="alchemy"><AlchemyPage /></RouteShell>;
}
