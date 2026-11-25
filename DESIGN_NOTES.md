# StudyQuest Color System & Design Notes

## 1. Before & After Summary

### Before
- **Monochrome white cards**: Almost every card, chip, and input used `#FFFFFF` on `#F5F5F2`, with lime (`#D9FF45`) as the only saturated color.
- **Weak/invisible tints**: Lavender and peach tints were too faint to read as domain signals.
- **Cold neutrals**: Tracks, disabled states, and secondary text leaned toward cold gray (`#55555D`, `#CCC`), clashing with the warm paper canvas.
- **No tonal ramps or semantic roles**: Components referenced `#D9FF45`, `bg-lime`, `text-red-600`, and raw hexes directly.
- **Leaked browser defaults**: Range sliders hardcoded `#D9FF45` and `rgba(11,11,12,0.12)`; native `accent-color` and `::selection` were unstyled.

### After
- **Semantic Role Tokens** (`src/app/globals.css`): All components consume semantic roles (`--bg`, `--surface`, `--surface-2`, `--surface-inverse`, `--on-inverse`, `--ink`, `--ink-muted`, `--ink-soft`, `--line`, `--border-strong`, `--primary`, `--on-primary`, `--primary-hover`, `--primary-pressed`, `--primary-tint`, `--primary-text`, `--domain-*-tint/fill/text`, `--success/warning/danger/info`, `--viz-1..8`).
- **OKLCH Tonal Ramps**: 10-step ramps (`50`–`900`) for Warm Neutrals, Lime, Violet, Coral-Orange, Teal, Pink-Magenta, Sky Blue, and Status hues.
- **60 / 30 / 10 + Dark Inverse Card**: Each primary view pairs warm neutral surfaces (`60%`), domain tints/blobs (`30%`), lime primary/active accents (`10%`), and a dedicated `surface-inverse` (`#1B1A17` / `#F6F4EE`) focal card:
  - **Home (`/`)**: `Flow Station` uses `surface-inverse`; `Quests` uses Coral-Orange blob; `Study velocity` uses Teal; `Lo-Fi` uses Tools/Sky; `Notes deck` uses Violet.
  - **Focus (`/timer`)**: `Focus Timer` hero uses `domain-focus-tint` (`#F3FFC2`); `Soundscape` uses `surface-inverse`; `Focus defense` uses Teal.
  - **Quests (`/tasks`)**: Columns are color-coded (`To do` Coral-Orange tint, `In progress` Violet tint, `Done` Teal tint).
  - **Analytics (`/analytics`)**: `Past year` heatmap uses `domain-stats-tint`; `Weekly velocity` uses `surface-inverse`; charts use `--viz-1..7` in domain order.
  - **Arcade (`/arcade`)**: `Trivia Dungeon` uses `surface-inverse` with Pink-Magenta (`domain-play`) accents.
- **4 Themes**: `paper` (`#F6F4EE`), `ink` (`#0F0E0C` dark redesign with 14–16% domain washes), `lavender` (`#ECE8FF`), and `peach` (`#FFEBDD`), remapping roles without changing component code.
- **Zero Leaked Defaults**: `accent-color: var(--primary)`, custom `::selection`, custom `Slider`, `Checkbox`, `Switch`, and `scrollbar-color` across all themes.

---

## 2. Automated Audit Results (`node scripts/palette-audit.mjs`)

### Component Hygiene
- **Default Tailwind color classes in `src/components` & `src/features`**: `0`
- **Raw hex literals in `src/components` & `src/features` (outside SVG/3D/canvas art)**: `0`
- **WCAG 2.1 Contrast failures across all 4 themes**: `0`

### Contrast Report (WCAG 2.1 AA: ≥ 4.5:1 body, ≥ 3.0:1 large/UI borders)

| Pair | Paper | Ink (Dark) | Lavender | Peach | Min |
| :--- | :---: | :---: | :---: | :---: | :---: |
| `ink` on `bg` | 17.16:1 | 17.54:1 | 15.48:1 | 15.89:1 | 4.5:1 |
| `ink` on `surface` | 18.87:1 | 15.98:1 | 18.52:1 | 18.36:1 | 4.5:1 |
| `ink` on `surface-2` | 15.85:1 | 14.41:1 | 14.16:1 | 14.67:1 | 4.5:1 |
| `ink-muted` on `bg` | 6.53:1 | 8.94:1 | 6.17:1 | 6.36:1 | 4.5:1 |
| `ink-muted` on `surface` | 7.18:1 | 8.15:1 | 7.38:1 | 7.34:1 | 4.5:1 |
| `on-inverse` on `surface-inverse` | 15.82:1 | 13.90:1 | 15.52:1 | 16.25:1 | 4.5:1 |
| `on-primary` on `primary` | 16.48:1 | 15.12:1 | 16.48:1 | 16.48:1 | 4.5:1 |
| `primary-text` on `surface` | 6.69:1 | 14.08:1 | 6.69:1 | 6.69:1 | 4.5:1 |
| `domain-notes-text` on `domain-notes-tint` | 7.40:1 | 8.51:1 | 7.40:1 | 7.40:1 | 4.5:1 |
| `domain-quests-text` on `domain-quests-tint` | 6.11:1 | 9.49:1 | 6.11:1 | 6.11:1 | 4.5:1 |
| `domain-stats-text` on `domain-stats-tint` | 6.23:1 | 11.23:1 | 6.23:1 | 6.23:1 | 4.5:1 |
| `domain-play-text` on `domain-play-tint` | 6.97:1 | 9.27:1 | 6.97:1 | 6.97:1 | 4.5:1 |
| `domain-tools-text` on `domain-tools-tint` | 6.90:1 | 9.52:1 | 6.90:1 | 6.90:1 | 4.5:1 |
| `success-text` on `success-tint` | 6.19:1 | 10.29:1 | 6.19:1 | 6.19:1 | 4.5:1 |
| `warning-text` on `warning-tint` | 6.53:1 | 10.48:1 | 6.53:1 | 6.53:1 | 4.5:1 |
| `danger-text` on `danger-tint` | 6.96:1 | 8.18:1 | 6.96:1 | 6.96:1 | 4.5:1 |
| `info-text` on `info-tint` | 6.81:1 | 8.98:1 | 6.81:1 | 6.81:1 | 4.5:1 |
| `ink-soft` (large text) on `surface` | 3.72:1 | 4.42:1 | 3.82:1 | 3.99:1 | 3.0:1 |
| `border-strong` (UI border) on `bg` | 17.16:1 | 3.30:1 | 15.48:1 | 15.89:1 | 3.0:1 |

### Color-Blind Simulation (Data-Viz & Status)
- **Protanopia**: min data-viz separation `46.7` (`viz-6` vs `viz-7`), min status separation `117.4` (`success` vs `warning`)
- **Deuteranopia**: min data-viz separation `34.9` (`viz-6` vs `viz-7`), min status separation `66.6` (`success` vs `danger`)
- **Tritanopia**: min data-viz separation `28.3` (`viz-3` vs `viz-4`), min status separation `36.9` (`success` vs `info`)

---

## 3. Playwright Visual & Browser Verification (`1366×650`)
Verified `/`, `/timer`, `/notes`, `/tasks`, and `/settings` across all 4 themes (`paper`, `ink`, `lavender`, `peach`) with `0` console errors and `0` native browser blue (`rgb(0, 117, 255)`) controls.
- Screenshots saved in conversation artifacts (`scratch/palette-shots/<route>-<theme>.png`).
- Verified squint test: each route shows a clear domain-tinted or `surface-inverse` hero card, warm neutral surfaces, and focused lime primary actions.
