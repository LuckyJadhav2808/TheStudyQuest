"use client";
import { PageFrame } from "@/components/ui/misc";
import { CodeWorkspace } from "./CodeWorkspace";

export function IdePage() {
  return <PageFrame title="IDE" subtitle="A multi-file workspace with a console, syntax checks and an AI copilot."><CodeWorkspace project="ide" /></PageFrame>;
}
