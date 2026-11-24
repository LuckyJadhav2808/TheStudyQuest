# Build log

- Phase 1: Used existing Next 16 + Tailwind 4 scaffold (no create-next-app). All package batches installed.
- Postgres/Drizzle from the template is retained only for `/api/health`; all user data lives in Dexie (IndexedDB).
- Native Web Audio + howler are used for sound; sound files are synthesised (no binary assets).
- Phases 2-11 built in order; `next typegen`, `tsc --noEmit` and `npm run build` pass.
- Stubs / limits: PPTX preview placeholder; C++/Java/Rust editor-only; Groups realtime sync is a local demo (Firebase auth helpers only); DSA sheets are curated subsets; EPUB reading is plain-text extraction via jszip (transitive dependency).
- Cursor and sound-pack shop items are equip toggles only (no runtime effect yet).
