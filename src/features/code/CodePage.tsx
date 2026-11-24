"use client";
import { PageFrame } from "@/components/ui/misc";
import { CodeWorkspace } from "./CodeWorkspace";

export function CodePage() {
  return <PageFrame title="Code Arena" subtitle="HTML, CSS, JS and TS run live. Python runs in a worker."><CodeWorkspace project="code" /></PageFrame>;
}
