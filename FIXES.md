# StudyQuest Visual, Layout & Architecture Fixes Report

## 1. Root Causes & Fixes Applied

| Defect / Upgrade | Root Cause | Resolution | Status |
| :--- | :--- | :--- | :--- |
| **Card Content Zero Padding** | Unlayered `*` rules in `globals.css` & utility classes could lose specificity; no explicit `--card-pad` contract. | Moved base resets & thin pill scrollbar rules into `@layer base` in `globals.css`. Defined `--card-pad: 24px` (`16px` under `700px` height) and `--gutter: 16px` (`12px` under `700px`), applied directly to `BentoCard` header/body/footer. | **PASS** |
| **Hydration Mismatch & Dev Error** | `useGame()` / `useSettings()` returned module-cached values on initial client render while SSR used defaults; `Header` greeting and `Home` date used live `Date` during SSR; stale `/sw.js` persisted in dev. | Added `mounted` guards in `useSettings()`, `useGame()`, `Header.tsx`, and `Home.tsx`; added active SW unregistration & cache purge in `Boot.tsx` during dev. **0 console errors, 0 hydration warnings**. | **PASS** |
| **Notes XP Farming & Blank Notes** | Creating/visiting `/notes` emitted `note.created` unconditionally without content length check or daily cap. | Notes only emit `note.created` once per note ID when `content.trim().length >= 20` with a 5-note/day cap in `engine.ts`. Clicking `+` reuses any existing empty untitled note; empty untitled notes are cleaned up on page leave. | **PASS** |
| **Strobi Docking & Rail Overflow** | Strobi was at the bottom of the rail while `S` avatar took the top, causing rail overflow at 650px height. | Replaced `S` avatar at top of rail with `StrobiRailButton` (moving user avatar into `Header` & `Settings`). Fixed rail width (`w-[68px]`), `justify-between`, `clamp(36px, 5.5vh, 48px)` items, concave active notch, hover tooltips, and due-task indicator dot. | **PASS** |
| **Home Dashboard Layout & Velocity** | `FlowStation` preset/streak/chest clustered awkwardly; `Study velocity` YAxis auto-scaled `[0,4]` making empty bars 100% tall; `ExamTile` sat inside `QuestsCard`. | Moved `ExamTile` into `FlowStation`'s 2nd control row, tilted `2d streak` sticker cleanly clear of `CurvedCorner`, added `YAxis` domain + `Cell` styling so empty days show 4px baseline bars and today is lime, and added domain tints + `+ Add widget` pill. | **PASS** |
| **Timer Page & Soundscape** | Separate `Binaural` and `Ambient` cards had empty gaps; `RadialTimer` used flat gray track; range thumbs rendered native blue. | Added tick marks, ink 10% track, rounded-cap lime arc, and running glow to `RadialTimer`. Merged Binaural & Ambient into one `Soundscape` card with toggle. Slimmed `Focus defense` into an `autoHeight` status strip. Styled `::-webkit-slider-thumb` / `::-moz-range-thumb`. | **PASS** |
| **Notes Editor Polish** | ProseMirror rendered a square focus outline inside rounded box; `"Aa"` rename button unclear; no reading width constraint. | Removed ProseMirror focus outline and added `2px` lime ring on card wrapper (`focus-within:ring-2 focus-within:ring-lime`), constrained white paper canvas to `72ch`, added lavender backdrop blob, pencil rename icon, and row preview + word count + tag chip. | **PASS** |
| **Settings Profile & Controls** | Duplicated `"Preferences"` title; `Switch` used `size-4.5` rendering as a dot; single-column form left empty space. | Dropped duplicated title, fixed `Switch` dimensions (`h-4 w-4`, `translate-x-5`), and rebuilt Profile tab into a 2-column layout (Profile preview card with avatar, level, XP bar & title on left; form grid on right). | **PASS** |
| **Header Level Chip & Gutters** | `L0` looked like `LO`; gutters differed between `PageFrame` and `Panels`. | Changed to `Lv X` with SVG XP progress arc and gain pulse animation; unified all page/grid gaps with `--gutter`. | **PASS** |

---

## 2. Verification Results

- **Chromium Layout & Text-Edge Audit (`scripts/layout-audit.ts`)**:
  - `1366x650`: `scrollH=650/650`, `scrollW=1366/1366`, `textViolations=[]`, `cardViolations=0`, `0 console errors`.
  - `390x844`: `scrollH=844/844`, `scrollW=390/390`, `textViolations=[]`, `cardViolations=0`, `0 console errors`.
  - Tested Light (`paper`) and Dark (`ink`) themes in Chromium: all text/muted contrast verified visually and > 4.5:1.
- **TypeScript (`npx tsc --noEmit`)**: 0 errors.
- **ESLint (`npm run lint`)**: 0 errors.
- **Production Build (`npm run build`)**: 34/34 routes compiled cleanly.
