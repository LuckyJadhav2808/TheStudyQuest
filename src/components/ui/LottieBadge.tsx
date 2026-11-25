"use client";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";

const SPARK_LOTTIE_DATA = {
  v: "5.7.4",
  fr: 30,
  ip: 0,
  op: 60,
  w: 80,
  h: 80,
  nm: "pulse",
  ddd: 0,
  assets: [],
  layers: [
    {
      ddd: 0,
      ind: 1,
      ty: 4,
      nm: "ring",
      sr: 1,
      ks: {
        o: { a: 1, k: [{ t: 0, s: [90] }, { t: 45, s: [0] }, { t: 60, s: [0] }] },
        r: { a: 0, k: 0 },
        p: { a: 0, k: [40, 40, 0] },
        a: { a: 0, k: [0, 0, 0] },
        s: { a: 1, k: [{ t: 0, s: [40, 40, 100] }, { t: 45, s: [110, 110, 100] }, { t: 60, s: [110, 110, 100] }] },
      },
      shapes: [
        { ty: "el", p: { a: 0, k: [0, 0] }, s: { a: 0, k: [44, 44] }, nm: "e" },
        { ty: "st", c: { a: 0, k: [0.49, 0.36, 1, 1] }, w: { a: 0, k: 4 }, o: { a: 0, k: 100 } },
      ],
      ip: 0,
      op: 60,
      st: 0,
    },
  ],
};

export function LottieBadge({ size = 56 }: { size?: number }) {
  return (
    <div style={{ width: size, height: size }} className="shrink-0">
      <DotLottieReact data={SPARK_LOTTIE_DATA} loop autoplay style={{ width: size, height: size }} />
    </div>
  );
}
