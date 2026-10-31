# Architecture

Garden Atlas is a client-only **React + TypeScript + Vite** web app deployed under `/Garden-Atlas/` on GitHub Pages. There are no server APIs, database accounts or cloud synchronization.

## Data and rendering

- `src/model.ts`: garden version-6 types, geometry/placement transforms, validators and sample garden. `src/legacy.ts`: historical format handling and linked-map migration.
- `src/storage.ts`: parsing and managing a library of gardens; fallback `localStorage` operations.
- `src/browserStorage.ts`: async IndexedDB snapshots, recovery records, ordered writes and cross-tab revision checks. The editor must wait for hydration before editing. A damaged primary record blocks saving until a user approves recovery; backup exports are offered before destructive changes.
- `src/App.tsx`: garden state, editor selection, undo history, tool transitions, storage decisions and callbacks. This is still a relatively large orchestration component and is **not yet fully separated**.
- `src/components/*`: presentational header, project list, mobile navigation, object catalog, garden Inspector, object icon and individual placed-object rendering. The catalog owns search/filter state; `src/components/GardenInspector.tsx` owns the existing object/group detail form markup. App owns placement, history, all Inspector mutations and persistence through explicit callbacks.
- `src/MapView.tsx`: camera, pointer interactions and SVG map layers. `src/components/MapObject.tsx` renders one placed object (no state mutation); `src/mapObjectGeometry.ts` calculates visual-only footprints and hit targets. `Sprite.tsx` and `VariantSprites.tsx` provide locally authored SVG pixel sprites.
- `src/PlantAtlasPanel.tsx` manages the UI for species and per-specimen records; `plantAtlas.ts` holds pure data transformations/validation.

## Saves, backups and offline

1. Hydrate the library from IndexedDB, falling back to older local data only when appropriate; block editing if invalid stored records require recovery.
2. Update in-memory garden state through validated edits; enqueue browser saves sequentially.
3. Check snapshot revisions before saving to avoid overwriting another tab's newer work. A conflict pauses saves rather than merging edits.
4. Export the garden or entire library as JSON. This is the user's portable independent backup, including compressed photos.
5. The Vite build generates a hashed app-shell service worker through `scripts/offlineWorker.mjs`. Cache storage holds **application assets**, not the garden library. A browser update is not a backup.

**Important:** A fresh browser tab may have no data. Clearing site data, reinstalling or eviction can remove everything. Backups should be downloaded before risking recovery or migration.

## Tests and boundaries

- `tests/*.test.mjs`: Node.js tests for the model, migrations, storage consistency, geometry and UI-related pure helpers.
- `e2e/*.spec.ts`: real Chromium smoke tests for first load and save/reload, using a newly created browser context, including a saved Inspector width/length round-trip.
- `.github/workflows/quality.yml`: PR quality validation. `.github/workflows/deploy.yml`: main-branch build and GitHub Pages deployment.

The old codebase intentionally has some large files (`App.tsx`, `MapView.tsx`, `styles.css`); contributors should avoid untested large-scale rewrites and extract behavior in focused steps.
