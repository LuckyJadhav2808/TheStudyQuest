"use client";
import Link from "next/link";
import { Drawer } from "vaul";
import { petsRepo } from "@/core/repos";
import { useRows } from "@/features/shared/hooks";
import { useUI } from "@/components/shell/ui-store";
import { PetPanel } from "./PetPanel";

export function CompanionDrawer() {
  const { companion, set } = useUI();
  const pets = useRows(petsRepo) ?? [];
  const pet = pets.find((p) => p.active) ?? pets[0];
  return (
    <Drawer.Root open={companion} onOpenChange={(o) => set({ companion: o })}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-[60] bg-black/40" />
        <Drawer.Content className="fixed inset-x-0 bottom-0 z-[61] mx-auto flex max-h-[85dvh] w-full max-w-md flex-col gap-3 rounded-t-[32px] border-[1.5px] border-line bg-surface p-5 text-fg outline-none">
          <Drawer.Title className="font-display text-2xl">Companion</Drawer.Title>
          <Drawer.Description className="sr-only">Feed and play with your active pet</Drawer.Description>
          {pet ? <PetPanel pet={pet} compact /> : <p className="text-sm text-muted">No pet yet. Hatch one on the Pets page.</p>}
          <Link href="/pets" onClick={() => set({ companion: false })} className="btn btn-sm self-start">Open habitat</Link>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
