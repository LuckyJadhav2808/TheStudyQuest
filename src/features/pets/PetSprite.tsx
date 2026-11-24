"use client";
import { SPECIES } from "./petLogic";

export function PetSprite({ species, stage, accessory, size = 120, sleepy = false }: { species: string; stage: number; accessory?: string; size?: number; sleepy?: boolean }) {
  const color = SPECIES.find((s) => s.id === species)?.color ?? "#7C5CFF";
  const r = 20 + stage * 5.5;
  const cy = 62;
  const stroke = { stroke: "#0b0b0c", strokeWidth: 2.2, strokeLinejoin: "round" as const };
  const eye = (x: number) => <rect x={x - 3.5} y={cy - 12} width={7} height={sleepy ? 4 : 17} rx={3.5} fill="#fff" transform={`rotate(6 ${x} ${cy})`} />;
  if (stage === 0) {
    return (
      <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={`${species} egg`}>
        <ellipse cx="50" cy="58" rx="26" ry="34" fill={color} {...stroke} />
        {[[40, 45], [60, 62], [44, 74], [58, 40]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={4.5} fill="#fff" opacity={0.7} />)}
        <ellipse cx="40" cy="38" rx="6" ry="9" fill="#fff" opacity="0.35" transform="rotate(-20 40 38)" />
      </svg>
    );
  }
  const ears = {
    noctis: <><path d={`M${50 - r * 0.8} ${cy - r * 0.6} L${50 - r * 0.55} ${cy - r - 10} L${50 - r * 0.15} ${cy - r * 0.9}Z`} fill={color} {...stroke} /><path d={`M${50 + r * 0.8} ${cy - r * 0.6} L${50 + r * 0.55} ${cy - r - 10} L${50 + r * 0.15} ${cy - r * 0.9}Z`} fill={color} {...stroke} /></>,
    whiskers: <><path d={`M${50 - r * 0.85} ${cy - r * 0.4} L${50 - r * 0.7} ${cy - r - 8} L${50 - r * 0.2} ${cy - r * 0.85}Z`} fill={color} {...stroke} /><path d={`M${50 + r * 0.85} ${cy - r * 0.4} L${50 + r * 0.7} ${cy - r - 8} L${50 + r * 0.2} ${cy - r * 0.85}Z`} fill={color} {...stroke} /></>,
    ignis: <><path d={`M${50 - r * 0.5} ${cy - r * 0.85} L${50 - r * 0.6} ${cy - r - 12} L${50 - r * 0.2} ${cy - r * 0.95}Z`} fill="#FFE2D2" {...stroke} /><path d={`M${50 + r * 0.5} ${cy - r * 0.85} L${50 + r * 0.6} ${cy - r - 12} L${50 + r * 0.2} ${cy - r * 0.95}Z`} fill="#FFE2D2" {...stroke} />{stage >= 3 && <path d={`M${50 + r * 0.9} ${cy} q${r * 0.8} -${r * 0.9} ${r * 0.2} -${r * 1.1} q-${r * 0.1} ${r * 0.5} -${r * 0.6} ${r * 0.8}Z`} fill="#FF8B4A" {...stroke} />}</>,
    kitsune: <><path d={`M${50 - r * 0.9} ${cy - r * 0.3} L${50 - r * 0.6} ${cy - r - 16} L${50 - r * 0.1} ${cy - r * 0.9}Z`} fill={color} {...stroke} /><path d={`M${50 + r * 0.9} ${cy - r * 0.3} L${50 + r * 0.6} ${cy - r - 16} L${50 + r * 0.1} ${cy - r * 0.9}Z`} fill={color} {...stroke} /><path d={`M${50 + r * 0.9} ${cy + r * 0.3} q${r * 0.9} ${r * 0.1} ${r * 0.5} -${r * 0.9} q-${r * 0.1} ${r * 0.6} -${r * 0.6} ${r * 0.7}Z`} fill="#fff" {...stroke} /></>,
    luna: <><ellipse cx={50 - r * 0.45} cy={cy - r - 8} rx={r * 0.2} ry={r * 0.6} fill={color} {...stroke} /><ellipse cx={50 + r * 0.45} cy={cy - r - 8} rx={r * 0.2} ry={r * 0.6} fill={color} {...stroke} /></>,
  }[species];
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={`${species}, ${["egg", "baby", "teen", "adult", "legendary"][stage]} stage`}>
      {stage === 4 && <circle cx="50" cy={cy} r={r + 10} fill="#D9FF45" opacity="0.35" />}
      {ears}
      <ellipse cx="50" cy={cy} rx={r} ry={r * 0.92} fill={color} {...stroke} />
      <ellipse cx="50" cy={cy + r * 0.3} rx={r * 0.55} ry={r * 0.4} fill="#fff" opacity="0.28" />
      <ellipse cx={50 - r * 0.45} cy={cy - r * 0.5} rx={r * 0.2} ry={r * 0.1} fill="#fff" opacity="0.5" transform="rotate(-30 40 40)" />
      {eye(50 - r * 0.28)}{eye(50 + r * 0.28)}
      {species === "whiskers" && <g stroke="#0b0b0c" strokeWidth="1.2"><path d={`M${50 - r * 0.9} ${cy + 4} h-8 M${50 - r * 0.9} ${cy + 9} l-7 3`} /><path d={`M${50 + r * 0.9} ${cy + 4} h8 M${50 + r * 0.9} ${cy + 9} l7 3`} /></g>}
      {accessory === "partyhat" && <path d={`M${50 - 10} ${cy - r * 0.8} L50 ${cy - r - 22} L${50 + 10} ${cy - r * 0.8}Z`} fill="#D9FF45" {...stroke} />}
      {accessory === "wizard" && <path d={`M${50 - 14} ${cy - r * 0.8} L${54} ${cy - r - 30} L${50 + 14} ${cy - r * 0.8}Z`} fill="#4B33C9" {...stroke} />}
      {accessory === "crown" && <path d={`M${50 - 14} ${cy - r * 0.85} l-2 -14 l8 7 l8 -11 l8 11 l8 -7 l-2 14Z`} fill="#E6B422" {...stroke} />}
      {accessory === "glasses" && <g fill="none" stroke="#0b0b0c" strokeWidth="2"><circle cx={50 - r * 0.28} cy={cy - 3} r="8" /><circle cx={50 + r * 0.28} cy={cy - 3} r="8" /><path d={`M${50 - r * 0.28 + 8} ${cy - 3} h${r * 0.56 - 16}`} /></g>}
      {accessory === "scarf" && <rect x={50 - r * 0.7} y={cy + r * 0.62} width={r * 1.4} height="9" rx="4.5" fill="#FF5A4A" {...stroke} />}
    </svg>
  );
}
