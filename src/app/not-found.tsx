import Link from "next/link";
import { StrobiFace } from "@/features/strobi/StrobiFace";

export default function NotFound() {
  return (
    <div className="grid h-full place-items-center p-4">
      <div className="bento-card flex max-w-md flex-col items-center gap-3 text-center">
        <StrobiFace mood="thinking" size={104} />
        <h1 className="font-display text-4xl">404. Lost in the dungeon</h1>
        <p className="text-sm text-muted">Strobi looked everywhere and this page is not here. Let's head back to base.</p>
        <Link href="/" className="btn btn-lime">Back home</Link>
      </div>
    </div>
  );
}
