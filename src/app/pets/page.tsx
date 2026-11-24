import { RouteShell } from "@/components/shell/RouteShell";
import { PetsPage } from "@/features/pets/PetsPage";

export default function Page() {
  return <RouteShell flag="pets"><PetsPage /></RouteShell>;
}
