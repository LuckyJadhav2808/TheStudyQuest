import { RouteShell } from "@/components/shell/RouteShell";
import { SkillsPage } from "@/features/skills/SkillsPage";

export default function Page() {
  return <RouteShell flag="skills"><SkillsPage /></RouteShell>;
}
