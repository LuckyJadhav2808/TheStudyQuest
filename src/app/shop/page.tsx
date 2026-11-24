import { RouteShell } from "@/components/shell/RouteShell";
import { ShopPage } from "@/features/shop/ShopPage";

export default function Page() {
  return <RouteShell flag="shop"><ShopPage /></RouteShell>;
}
