"use client";

export interface StrobiBehaviour {
  lookX: number;
  lookY: number;
  tiltZ: number;
  idleBounce?: boolean;
}

export const strobiPageBehaviour: Record<string, StrobiBehaviour> = {
  "/": { lookX: 0.25, lookY: 0.05, tiltZ: 0 },
  "/timer": { lookX: 0.75, lookY: 0.05, tiltZ: -0.05 },
  "/notes": { lookX: 0.65, lookY: 0.15, tiltZ: 0.04 },
  "/arcade": { lookX: 0.45, lookY: 0.1, tiltZ: 0, idleBounce: true },
  "/settings": { lookX: 0.35, lookY: 0.1, tiltZ: 0.18 },
  "/code": { lookX: 0.65, lookY: 0.1, tiltZ: -0.04 },
  "/tasks": { lookX: 0.6, lookY: 0.1, tiltZ: 0.05 },
  "/reader": { lookX: 0.65, lookY: 0.1, tiltZ: 0 },
};

export function getStrobiBehaviour(path: string): StrobiBehaviour {
  const key = Object.keys(strobiPageBehaviour).find((k) => (k === "/" ? path === "/" : path.startsWith(k)));
  return key ? strobiPageBehaviour[key] : strobiPageBehaviour["/"];
}
