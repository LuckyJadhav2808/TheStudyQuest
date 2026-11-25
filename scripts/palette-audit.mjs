#!/usr/bin/env node
/**
 * StudyQuest Palette & Contrast Audit
 * 1. Fails on default Tailwind color classes or raw hexes in components (outside SVG/3D/canvas art).
 * 2. Computes WCAG 2.1 contrast ratios for all semantic text/background & border pairs across 4 themes.
 * 3. Runs color-blind simulation (Protanopia, Deuteranopia, Tritanopia) on data-viz & status palettes.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SCAN_DIRS = ["src/components", "src/features"];
const RAW_HEX_ALLOWLIST = new Set([
  path.normalize("src/features/pets/PetSprite.tsx"),
  path.normalize("src/features/strobi/StrobiFace.tsx"),
  path.normalize("src/features/strobi/StrobiScene.tsx"),
  path.normalize("src/features/arcade/PetCatch.tsx"),
  path.normalize("src/lib/confetti.ts"),
  path.normalize("src/features/settings/SettingsPage.tsx"), // theme swatch previews
]);

const DEFAULT_TW_RE =
  /\b(?:bg|text|border|ring|fill|stroke)-(?:gray|slate|zinc|neutral|stone|red|orange|amber|yellow|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-[0-9]{2,3}\b/g;
const HEX_RE = /#[0-9a-fA-F]{3,8}\b/g;

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (/\.(tsx?|css)$/.test(entry.name)) out.push(full);
  }
  return out;
}

// ---------- 1. Component Token Hygiene Check ----------
const twViolations = [];
const hexViolations = [];

for (const base of SCAN_DIRS) {
  const files = walk(path.join(ROOT, base));
  for (const file of files) {
    const rel = path.normalize(path.relative(ROOT, file));
    const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
    lines.forEach((line, idx) => {
      const tw = line.match(DEFAULT_TW_RE);
      if (tw) twViolations.push(`${rel}:${idx + 1} -> ${tw.join(", ")}`);
      if (!RAW_HEX_ALLOWLIST.has(rel)) {
        const hx = line.match(HEX_RE);
        if (hx && !line.trim().startsWith("//") && !line.trim().startsWith("*")) {
          hexViolations.push(`${rel}:${idx + 1} -> ${hx.join(", ")}`);
        }
      }
    });
  }
}

// ---------- 2. Color Math & WCAG 2.1 Contrast ----------
function hexToRgb(hex) {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

function parseColor(str, fallbackBg = [246, 244, 238]) {
  const s = str.trim();
  if (s.startsWith("#")) return hexToRgb(s);
  const m = s.match(/rgba?\(([^)]+)\)/i);
  if (m) {
    const parts = m[1].split(",").map((x) => parseFloat(x.trim()));
    const [r, g, b] = parts;
    const a = parts[3] ?? 1;
    return [
      Math.round(r * a + fallbackBg[0] * (1 - a)),
      Math.round(g * a + fallbackBg[1] * (1 - a)),
      Math.round(b * a + fallbackBg[2] * (1 - a)),
    ];
  }
  return null;
}

function relLum([r, g, b]) {
  const f = (c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function contrast(c1, c2) {
  const l1 = relLum(c1);
  const l2 = relLum(c2);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

// Theme definitions extracted from globals.css
const globals = fs.readFileSync(path.join(ROOT, "src/app/globals.css"), "utf8");
function extractThemeVars(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\}`, "m");
  const m = globals.match(re);
  if (!m) return {};
  const vars = {};
  for (const line of m[1].split("\n")) {
    const vm = line.match(/^\s*(--[a-z0-9-]+)\s*:\s*([^;]+);/i);
    if (vm) vars[vm[1]] = vm[2].trim();
  }
  return vars;
}

const baseVars = extractThemeVars(":root,\n[data-theme=\"paper\"]");
const THEMES = {
  paper: baseVars,
  ink: { ...baseVars, ...extractThemeVars('[data-theme="ink"]') },
  lavender: { ...baseVars, ...extractThemeVars('[data-theme="lavender"]') },
  peach: { ...baseVars, ...extractThemeVars('[data-theme="peach"]') },
};

const PAIRS = [
  { name: "ink on bg", fg: "--ink", bg: "--bg", min: 4.5 },
  { name: "ink on surface", fg: "--ink", bg: "--surface", min: 4.5 },
  { name: "ink on surface-2", fg: "--ink", bg: "--surface-2", min: 4.5 },
  { name: "ink-muted on bg", fg: "--ink-muted", bg: "--bg", min: 4.5 },
  { name: "ink-muted on surface", fg: "--ink-muted", bg: "--surface", min: 4.5 },
  { name: "ink-muted on surface-2", fg: "--ink-muted", bg: "--surface-2", min: 4.5 },
  { name: "on-inverse on surface-inverse", fg: "--on-inverse", bg: "--surface-inverse", min: 4.5 },
  { name: "on-primary on primary", fg: "--on-primary", bg: "--primary", min: 4.5 },
  { name: "primary-text on surface", fg: "--primary-text", bg: "--surface", min: 4.5 },
  { name: "domain-notes-text on domain-notes-tint", fg: "--domain-notes-text", bg: "--domain-notes-tint", min: 4.5 },
  { name: "domain-quests-text on domain-quests-tint", fg: "--domain-quests-text", bg: "--domain-quests-tint", min: 4.5 },
  { name: "domain-stats-text on domain-stats-tint", fg: "--domain-stats-text", bg: "--domain-stats-tint", min: 4.5 },
  { name: "domain-play-text on domain-play-tint", fg: "--domain-play-text", bg: "--domain-play-tint", min: 4.5 },
  { name: "domain-tools-text on domain-tools-tint", fg: "--domain-tools-text", bg: "--domain-tools-tint", min: 4.5 },
  { name: "success-text on success-tint", fg: "--success-text", bg: "--success-tint", min: 4.5 },
  { name: "warning-text on warning-tint", fg: "--warning-text", bg: "--warning-tint", min: 4.5 },
  { name: "danger-text on danger-tint", fg: "--danger-text", bg: "--danger-tint", min: 4.5 },
  { name: "info-text on info-tint", fg: "--info-text", bg: "--info-tint", min: 4.5 },
  { name: "ink-soft (large text) on surface", fg: "--ink-soft", bg: "--surface", min: 3.0 },
  { name: "border-strong (UI border) on bg", fg: "--border-strong", bg: "--bg", min: 3.0 },
];

const contrastFailures = [];
console.log("=== CONTRAST AUDIT ACROSS 4 THEMES ===");
for (const [themeName, vars] of Object.entries(THEMES)) {
  const bgFallback = parseColor(vars["--bg"]) ?? [246, 244, 238];
  const surfaceFallback = parseColor(vars["--surface"], bgFallback) ?? bgFallback;
  console.log(`\nTheme: ${themeName}`);
  for (const p of PAIRS) {
    const bg = parseColor(vars[p.bg], bgFallback);
    const fg = parseColor(vars[p.fg], p.bg === "--surface" ? surfaceFallback : bg ?? bgFallback);
    if (!bg || !fg) continue;
    const ratio = contrast(fg, bg);
    const ok = ratio >= p.min;
    const tag = ok ? "PASS" : "FAIL";
    console.log(`  [${tag}] ${p.name.padEnd(38)} ${ratio.toFixed(2)}:1 (min ${p.min}:1)`);
    if (!ok) contrastFailures.push(`${themeName} | ${p.name}: ${ratio.toFixed(2)}:1 < ${p.min}:1`);
  }
}

// ---------- 3. Color-Blind Simulation (Machado 2009 / Viénot) ----------
const CVD_MATRICES = {
  protanopia: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  deuteranopia: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.011820, 0.042940, 0.968881],
  ],
  tritanopia: [
    [1.255528, -0.076749, -0.178779],
    [-0.078411, 0.930809, 0.147602],
    [0.004733, 0.691367, 0.303900],
  ],
};

function simCvd([r, g, b], mat) {
  const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
  return [
    clamp(mat[0][0] * r + mat[0][1] * g + mat[0][2] * b),
    clamp(mat[1][0] * r + mat[1][1] * g + mat[1][2] * b),
    clamp(mat[2][0] * r + mat[2][1] * g + mat[2][2] * b),
  ];
}

function rgbDist(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

console.log("\n=== COLOR-BLIND SIMULATION (DATA-VIZ & STATUS) ===");
const vizColors = [1, 2, 3, 4, 5, 6, 7, 8].map((i) => ({
  name: `viz-${i}`,
  rgb: parseColor(baseVars[`--viz-${i}`]),
}));
const statusColors = ["success", "warning", "danger", "info"].map((k) => ({
  name: k,
  rgb: parseColor(baseVars[`--${k}`]),
}));

for (const [type, mat] of Object.entries(CVD_MATRICES)) {
  let minVizDist = Infinity;
  let minVizPair = "";
  const simViz = vizColors.map((c) => ({ name: c.name, rgb: simCvd(c.rgb, mat) }));
  for (let i = 0; i < simViz.length; i++) {
    for (let j = i + 1; j < simViz.length; j++) {
      const d = rgbDist(simViz[i].rgb, simViz[j].rgb);
      if (d < minVizDist) {
        minVizDist = d;
        minVizPair = `${simViz[i].name} vs ${simViz[j].name}`;
      }
    }
  }
  let minStatusDist = Infinity;
  let minStatusPair = "";
  const simStatus = statusColors.map((c) => ({ name: c.name, rgb: simCvd(c.rgb, mat) }));
  for (let i = 0; i < simStatus.length; i++) {
    for (let j = i + 1; j < simStatus.length; j++) {
      const d = rgbDist(simStatus[i].rgb, simStatus[j].rgb);
      if (d < minStatusDist) {
        minStatusDist = d;
        minStatusPair = `${simStatus[i].name} vs ${simStatus[j].name}`;
      }
    }
  }
  console.log(
    `  ${type.padEnd(13)} | min viz separation: ${minVizDist.toFixed(1)} (${minVizPair}) | min status separation: ${minStatusDist.toFixed(1)} (${minStatusPair})`
  );
}

console.log("\n=== HYGIENE SUMMARY ===");
console.log(`Default Tailwind color classes in components/features: ${twViolations.length}`);
if (twViolations.length) console.log(twViolations.map((x) => "  " + x).join("\n"));
console.log(`Raw hexes in components/features (outside SVG/3D art): ${hexViolations.length}`);
if (hexViolations.length) console.log(hexViolations.map((x) => "  " + x).join("\n"));
console.log(`Contrast failures: ${contrastFailures.length}`);
if (contrastFailures.length) console.log(contrastFailures.map((x) => "  " + x).join("\n"));

if (twViolations.length > 0 || contrastFailures.length > 0 || hexViolations.length > 0) {
  process.exitCode = 1;
}
