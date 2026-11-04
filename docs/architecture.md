# Architecture

Garden Atlas is a client-only **React + TypeScript + Vite** web app deployed under `/Garden-Atlas/` on GitHub Pages. There are no server APIs, database accounts or cloud synchronization.

## Data and rendering

- `src/model.ts`: garden version-6 types, geometry/placement transforms, validators and sample garden. `src/legacy.ts`: historical format handling and linked-map migration.
- `src/storage.ts`: parsing and managing a library of gardens; fallback `localStorage` operations.
- `src/browserStorage.ts`: async IndexedDB snapshots, recovery records, ordered writes and cross-tab revision checks. The editor must wait for hydration before editing. A damaged primary record blocks saving until a user approves recovery; backup exports are offered before destructive changes.
- `src/App.tsx`: garden state, validation, tool transitions, storage decisions and UI callbacks. This remains a relatively large orchestration component and is **not yet fully separated**.
- `src/history.ts` implements pure capped undo/redo snapshot and timed burst transitions. `src/hooks/useGardenHistory.ts` owns ephemeral history stacks, while App retains garden validation, user-facing messages, migration decisions and save behavior.
- `src/hooks/useEditorSelection.ts`: transient item/group/feature selection and project-switch selection reset. `src/editorObjectActions.ts`: immutable object patch, bulk deletion/group assignment, group creation and duplication. App continues to own lock checks, confirmations, validation, history and persistence.
- `src/components/*`: presentational header, project list, mobile navigation, object catalog, garden object/group list, layer/terrain/line controls, garden Inspector, object icon and individual placed-object rendering. The object/group list and layers panel are presentation-only: App owns selection, group assignments, locks and feature edits. The catalog owns search/filter state; `src/components/GardenInspector.tsx` owns the existing object/group detail form markup. App owns placement, history, all Inspector mutations and persistence through explicit callbacks.
- `src/components/MapEditingToolbar.tsx` renders the existing map tool, terrain, snap, multi-select and undo/redo controls. `src/toolAccess.ts` contains the original locked-layer and unfinished-draft transition rules as pure functions; App retains user confirmations and state mutations.
- `src/components/MapSizePanel.tsx` and `src/components/ReferenceImagePanel.tsx`: map-size and tracing-image controls only. `App.tsx` still owns input state, validations, change confirmation, image processing, edit history and persistence.
- `src/mapSurfacePalette.ts` defines five terrain colors and stable SVG paint references. `src/components/MapSurfacePatterns.tsx` contains their fixed-cost, world-aligned pixel tiles. The same visual textures are used by base ground and regions in both views, with no changes to measurements. See `docs/visual-audit.md`.
- `src/MapView.tsx`: camera, pointer interactions, gesture cancellation and drawing draft state. `src/components/MapScene.tsx` renders the SVG garden layers and feature hit targets without owning pointer actions or garden mutations. `src/components/MapObject.tsx` renders each placed object; `src/mapObjectGeometry.ts` handles visual-only footprints and `src/mapPreview.ts` computes drag preview offsets without changing garden records. `Sprite.tsx` and `VariantSprites.tsx` provide locally authored SVG pixel sprites.
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

## Sub-metre garden lines (P037)

The shared `lineDimensions.ts` defines path/fence limits, width presets and visual outline sizing. Both new lines and existing line edits use the same 0.05 m minimum; open line segments may also be shorter than 1 m. The garden still uses schema v6 and stores exact width values in metres. `MapView` retains close endpoints for open paths and fences, while closed polygon simplification is unchanged. Touch/feature edit targets remain visually generous even for very thin strokes.

## Map line art (P038)

`src/components/MapLineArt.tsx` paints path/fence SVGs and `src/mapLineArt.ts` computes decorative fence post points from readonly geometry. Both maps use identical physical widths, and `MapScene.tsx` retains the existing transparent hit areas and edit handles. No persisted schema or coordinate changes.

## Zoom-dependent visual feedback (P039)

`src/mapZoomVisuals.ts` provides two pure presentation helpers: stable screen-readable selection borders/labels and a dashed visibility indicator for sub-pixel paths/fences. `MapObject.tsx` and `MapLineArt.tsx` consume current camera zoom without modifying object dimensions, line widths, SVG interaction targets or stored records. Gesture handling remains in `MapView.tsx`. Small-phone CSS modifies only visual spacing and minimum button sizes.
