# StudyQuest Visual & Layout Fixes Report

This document records the visual, layout, and component defects identified during testing and their resolutions.

---

## 1. Summary of Issues & Root Causes

| Defect / Problem | Root Cause | Resolution | Status |
| :--- | :--- | :--- | :--- |
| **Card Content Clipped / Spilling / Inner Scrollbars** | Cards lacked a strict sizing and scaling contract. Fixed-height children and unconstrained SVGs exceeded available card bounds, especially on small laptop heights (1366x650) and mobile. | Built unified `<BentoCard>` primitive with `container-type: size`. Content inside card bodies scales dynamically (`min(100cqw, 100cqh)`, `aspect-ratio: 1`, `cqmin`). Unclipped inner scroll is restricted solely to lists inside `<ScrollArea>`. | **PASS** |
| **Header Eating Screen Height** (~230px tall) | Every route rendered both the global layout greeting header AND an inner `PageFrame` title block, consuming 200–230px of vertical space before any content began. | Replaced with ONE compact 64px header row (`Header.tsx`). Non-home routes display the route title, with secondary subtitle shown conditionally only on taller screens (`h >= 800`). Stat chips and action buttons are cleanly right-aligned. | **PASS** |
| **Full-Screen Desktop Drawer Overlay** | Clicking grouped categories ("Plan", "Learn", "Tools", etc.) on desktop triggered a giant full-page drawer covering the page content. | Replaced desktop drawer with a floating 320px popover anchored cleanly beside the rail (`left-[84px] top-14 z-[65]`). Preserved the Vaul bottom sheet for mobile viewports. | **PASS** |
| **Strobi Floating Above Card Content** | Strobi hovered as a floating button in the bottom right corner of desktop cards, covering buttons and text (e.g. "All notes"). | Docked Strobi directly into the bottom of the black desktop navigation pill rail as `StrobiRailButton`, with an active notch state and quick menu anchored at `left-[84px]`. | **PASS** |
| **Native Unstyled Form Controls** | Dropdowns, range sliders, file uploads, and checkboxes rendered as default browser primitives without brand styling. | Built custom accessible UI controls conforming to Soft Bento Brutalism: `DashedDropzone` with drag-and-drop, custom range sliders with lime progress track, custom `Switch` toggle pills, and custom 1.5px ink-bordered `Checkbox` elements with lime fill. | **PASS** |
| **Home Page Layout Cramping** | Hero Flow Station crammed a timer ring, preset chips, and a secondary widget list into one card, overflowing at 1366x650. | Rebuilt Home: Flow Station now features the ring on the left with presets, start button, and streak chip on the right. Quests has dedicated tabs and countdown tile. Study velocity displays baseline bar skeletons and unclipped day labels. | **PASS** |
| **Timer Page Three-Column Sizing** | Focus card ring, Binaural beats "Start tones" button, and Ambient mixer sliders overflowed the viewport bottom. | Scaled RadialTimer ring to `cqmin`, shortened headphone notice to single line, and fitted all 3 columns within 650px height with zero page or card overflow. | **PASS** |
| **Settings Page Three-Column Overflow** | Settings was split across 3 tall columns with clipped avatar and unstyled checkboxes. | Consolidated into a single card with top segmented control `[Profile | Look & Sound | AI | Data | Features]`. Formatted storage stats and styled all feature toggles. | **PASS** |
| **Notes Page Dual Toolbars** | Formatting controls, view mode switch, and floating "No side dock" button took up multiple rows. | Integrated "No side dock" and an "Export" dropdown into one single compact toolbar row. Editor canvas uses paper-white background and integrated autosave footer. | **PASS** |
| **Reader Page Empty State & File Input** | Raw HTML `<input type="file">` and empty space in the lower half of Document Studio. | Replaced with `DashedDropzone` and filled the lower studio half with tool status and batch progress indicators. | **PASS** |
| **Exams Page Form & Radar** | Add exam form was broken across rows, date picker unstyled. | Standardized single-row Add exam form, custom styled date picker, and BentoCard countdown radar. | **PASS** |

---

## 2. Viewport Verification Matrix

Tested and verified in Chromium across all 7 target viewports:

| Viewport | Device Profile | Page Scroll (`scrollHeight <= innerHeight`) | Horizontal Scroll (`scrollWidth <= innerWidth`) | Status |
| :--- | :--- | :---: | :---: | :---: |
| **1920x900** | Large Desktop | **PASS** (900/900) | **PASS** (1920/1920) | **PASS** |
| **1440x800** | Standard Desktop | **PASS** (800/800) | **PASS** (1440/1440) | **PASS** |
| **1366x650** | Small Laptop | **PASS** (650/650) | **PASS** (1366/1366) | **PASS** |
| **1024x700** | Tablet Landscape | **PASS** (700/700) | **PASS** (1024/1024) | **PASS** |
| **768x1024** | Tablet Portrait | **PASS** (1024/1024) | **PASS** (768/768) | **PASS** |
| **390x844** | Modern Mobile | **PASS** (844/844) | **PASS** (390/390) | **PASS** |
| **360x640** | Small Mobile | **PASS** (640/640) | **PASS** (360/360) | **PASS** |

---

## 3. Production Health Checks

- `npx tsc --noEmit`: **0 errors**
- `npm run lint`: **0 errors**
- `npm run dev`: Running at `http://localhost:3000`
- Service Worker dev caching: Disabled in development (`NODE_ENV === "production"` check) to prevent stale asset caches.
