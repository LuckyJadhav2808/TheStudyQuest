# StudyQuest Design Audit & Upgrade Notes

## Part 2: Route-by-Route Design Audit (5 Questions + 1–5 Scoring)

Scoring axes (1–5): **Purpose** (clarity of #1 job) · **Space** (viewport fill, no dead >15% voids) · **Colour** (domain tint & hierarchy) · **Empty** (witty/ghost/centered empty state) · **Polish** (typography, depth, motion).

### 1. `/` — Home (`Today`)
- **ONE thing**: Start a focus block and see today's study pulse at a glance.
- **Full vs Empty**: Full shows active timer arc, exam countdown, active quests, 7-day bars, lo-fi wave, and recent notes. Empty shows ghost velocity bars ("Your week starts here."), Strobi idle in Quests with ghost cards, and ready-to-play Lo-Fi & Flow Station.
- **Eye path**: 1) 72px+ Focus Ring & Start button -> 2) Quests list -> 3) Velocity / Lo-Fi / Notes deck.
- **Wasted**: Hero top-middle had empty whitespace; Lo-Fi was a play button in a void.
- **Alive**: Lime progress arc + glow while running, CSS-animated Lo-Fi equaliser bars, count-up XP/streak.
- **Score Before**: Purpose 4 · Space 3 · Colour 3 · Empty 3 · Polish 3 (**Avg 3.2**)

### 2. `/timer` — Focus Timer
- **ONE thing**: Run a deep-work Pomodoro session with matching soundscape.
- **Full vs Empty**: Shows live countdown ring + Soundscape mixer/binaural waves + today's session stats.
- **Eye path**: 1) Lime-tinted Timer card & 72px+ countdown -> 2) Start button & session stat chips -> 3) Soundscape card.
- **Wasted**: Large empty whitespace around ring and in Binaural/Soundscape bottom half.
- **Alive**: Running lime glow on ring, dual-wave SVG frequency visual in Binaural, 3 session stat chips.
- **Score Before**: Purpose 5 · Space 3 · Colour 3 · Empty 3 · Polish 3 (**Avg 3.4**)

### 3. `/notes` — Notes
- **ONE thing**: Write and organize rich Markdown/KaTeX/Mermaid study notes distraction-free.
- **Full vs Empty**: Full shows preview + tag chips in catalog, 72ch white paper editor. Empty shows Strobi + CTA and ghost "New note" card in catalog.
- **Eye path**: 1) Note title & 72ch paper editor -> 2) Single-row toolbar -> 3) Catalog list.
- **Wasted**: Two toolbar rows, lime outline looked like an error state, empty catalog bottom.
- **Alive**: Soft lime focus glow on editor card, reading-time + word count in footer, lavender backdrop blob.
- **Score Before**: Purpose 4 · Space 3 · Colour 3 · Empty 3 · Polish 3 (**Avg 3.2**)

### 4. `/code` — Code Arena
- **ONE thing**: Write, run, and debug multi-file web/Python code with live preview & AI help.
- **Full vs Empty**: Full shows files, dark editor with pinned Run, live preview, console, and AI pills.
- **Eye path**: 1) Dark editor & lime Run button -> 2) Live Preview -> 3) Console & AI pill row.
- **Wasted**: **CRITICAL** — All 3 cards collapsed to content height, leaving ~60% of the viewport blank!
- **Alive**: Stretching `minmax(0,1fr)` 3-column layout, AI action pills above console, instant preview updates.
- **Score Before**: Purpose 3 · Space 1 · Colour 2 · Empty 2 · Polish 2 (**Avg 2.0**)

### 5. `/tasks` — Quests (Kanban)
- **ONE thing**: Track and complete study tasks across To do, In progress, and Done.
- **Full vs Empty**: Full shows tinted columns with priority cards. Empty shows progress strip (`0 of 0 quests done today`), Strobi only in To do, and dashed dropzones with faint ghost cards in In progress / Done.
- **Eye path**: 1) Progress strip & To do column -> 2) In progress -> 3) Done.
- **Wasted**: **CRITICAL** — Columns collapsed to content height, unequal heights, 3 repeated Strobis, 2 competing lime `+` buttons in header.
- **Alive**: Column header tints (peach/lavender/teal) + count badges, hover lift, completion XP pop.
- **Score Before**: Purpose 3 · Space 1 · Colour 2 · Empty 2 · Polish 2 (**Avg 2.0**)

### 6. `/arcade` — Arcade
- **ONE thing**: Battle Trivia Dungeon monsters and play Pet Catch to earn daily coins.
- **Full vs Empty**: Shows Trivia Dungeon hero (left) + stacked Pet Catch & Leaderboard with coin-cap bar (right).
- **Eye path**: 1) Monster HP & 2x2 A/B/C/D answer grid -> 2) Pet Catch arena -> 3) Leaderboard & coin cap bar.
- **Wasted**: **CRITICAL** — 3 cards at 3 different heights, Pet Catch too small, hydration error in console.
- **Alive**: Damage number pop animation on Trivia hits, HP bar transition, daily coin-cap progress bar.
- **Score Before**: Purpose 3 · Space 2 · Colour 2 · Empty 2 · Polish 2 (**Avg 2.2**)

### 7. `/reader` — Reader & Document Studio
- **ONE thing**: Read/listen to study documents locally and run in-browser PDF tools.
- **Full vs Empty**: Empty shows full-card dashed dropzone with format chips + Recent documents strip. Document Studio uses a 3x2 `ToolTile` grid (no clipped tabs).
- **Eye path**: 1) Sky-blue tinted Reader dropzone -> 2) 3x2 ToolTile grid in Document Studio -> 3) Recent documents.
- **Wasted**: **CRITICAL** — Empty left card, unused bottom half in studio, `"Image"` tab clipped on right.
- **Alive**: Interactive 3x2 tool tiles, format chips, recent docs stored in Dexie.
- **Score Before**: Purpose 3 · Space 2 · Colour 2 · Empty 2 · Polish 2 (**Avg 2.2**)

### 8. `/settings` — Settings
- **ONE thing**: Customize profile, theme, audio, AI keys, local data, and feature flags.
- **Full vs Empty**: Left column has tall profile card with equipped title + lifetime stats (focus hours, tasks, notes, streak); right column has form grid + achievements/titles grid (locked as ghosts) + danger-zone strip.
- **Eye path**: 1) Left profile stats card -> 2) Form & achievements -> 3) Danger zone.
- **Wasted**: Bottom 40% of Profile tab was blank.
- **Alive**: Live theme preview, XP progress bar, achievement unlock badges.
- **Score Before**: Purpose 4 · Space 2 · Colour 3 · Empty 3 · Polish 3 (**Avg 3.0**)

### 9–28. Remaining Routes Audit
- `/dsa`: **Avg 3.4** — Needs stretching `h-full` grid, lavender Learn tint, and StatChip summary (Easy/Med/Hard solved).
- `/ml`: **Avg 3.2** — Needs stretching `h-full` layout, lavender HeroCard for active lesson, and clear tier progress.
- `/notebook`: **Avg 3.0** — Needs `h-full` cell list + lavender tint + clean Run-all header.
- `/ide`: **Avg 2.8** — Needs `minmax(0,1fr)` stretching 3-column layout matching Code Arena.
- `/whiteboard`: **Avg 3.6** — Full-bleed canvas; add sky-blue header/tool polish and `h-full` frame.
- `/habits`: **Avg 3.2** — Needs peach Plan tint, stretching grid, and ghost habit placeholders when empty.
- `/tracker`: **Avg 3.2** — Needs peach/teal tinting, `h-full` syllabus & log cards, StatChips for coverage %.
- `/chat`: **Avg 3.4** — Needs lavender tint, centered 72ch chat column, witty Strobi persona empty state.
- `/exams`: **Avg 3.2** — Needs peach HeroCard countdown, big tabular-nums days-left display, ghost checklist when empty.
- `/pets`: **Avg 3.2** — Needs orange Play tint, hero companion stage with hard offset shadow, stat bars.
- `/shop`: **Avg 3.2** — Needs orange Play tint, coin balance StatChip, stretching catalog grid.
- `/alchemy`: **Avg 3.0** — Needs orange/violet tint, cauldron hero card, ingredient chips, `h-full` layout.
- `/skills`: **Avg 3.0** — Needs `h-full` skill tree canvas with domain color nodes and stat summary.
- `/timetable`: **Avg 3.0** — Needs `h-full` weekly grid stretching to viewport, peach tint, ghost slot hints.
- `/resources`: **Avg 3.0** — Needs sky-blue Tools tint, `h-full` card, ghost resource cards when empty.
- `/snippets`: **Avg 3.0** — Needs lavender/sky tint, `h-full` split view (list + preview), ghost state.
- `/analytics`: **Avg 3.2** — Needs teal Stats tint, big 64px+ focus/XP StatChips, stretching chart grid.
- `/groups`: **Avg 3.0** — Needs `h-full` stretching cards, peach/lavender tint, clear offline/peer empty state.
- `/admin`: **Avg 3.0** — Needs `h-full` system diagnostics cards and StatChips.
- `/login`: **Avg 3.4** — Needs centered HeroCard with hard offset shadow (`4px 4px 0 var(--ink)`), Strobi greeting, and theme-aware contrast.

---

## Upgrade Log
*(Updated per commit as primitives and pages are upgraded.)*
