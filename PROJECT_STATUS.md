## P030 — Sidebar architecture and regression coverage (2026-10-31)

- Extracted the left sidebar object list, batch selection, alignment, group controls, layers and feature lists into `GardenObjectList.tsx` and `GardenLayersPanel.tsx`.
- Kept all garden mutations, tool-lock safeguards, selections, history, navigation and storage state in `App.tsx`, passed through explicitly typed callbacks.
- Preserved the P028 Android install manifest and offline worker unchanged, including its working standalone installation.
- Updated historical UI tests to follow the new component boundary; added tests for delegated callbacks and a Chromium smoke test for visibility, object batch selection and group creation.
- No garden format, artwork, storage, or user-facing feature changes.

# Garden Atlas P029 — Inspector Refactor (2026-10-31)

- Maintenance-only release based on P028 (`908fe91167739462e6a756cd51fcaf537d31215d`), whose Android installation was confirmed working by the user.
- Object/group Inspector markup is now in `src/components/GardenInspector.tsx`; `App.tsx` retains all editing decisions, undo history, persistence and navigation callbacks.
- Existing object measurements, notes, species, appearance, plant atlas and group controls remain accessible under the same CSS classes and keyboard behaviors. No garden format or save change.
- Regression tests follow the actual component boundary; a Chromium test now exercises width/length editing and persistence after reload. CI verifies TypeScript/ESLint and browser tests.
- Existing P028 installation assets and service worker preserved without modification.

# P028 — Android Installability Cache Compatibility (2026-10-31)

- The live production URL passed Chromium DevTools manifest checks with zero reported installability errors, but Brave and Chrome on the user's Android device still show installation disabled. Cause on that specific device remains unverified.
- Added a fresh manifest path and icon filenames to avoid Android cache reusing prior corrupted icon assets; preserved manifest identity, garden files and IndexedDB storage.
- Replaced service-worker navigation cache-first with network-first plus offline fallback, so subsequent HTML updates can appear without waiting on an old cached shell.
- Verify Android installation after applying the update. Do not clear site storage to troubleshoot, as this could erase local gardens.

# Garden Atlas — P027 Android Installability Repair (2026-10-31)

- Confirmed P026's 192x192 and 512x512 install icon PNG files are corrupt (not just visually imperfect); PIL image decoding fails and PNG integrity checks fail. The browser displays "This app cannot be installed" rather than the expected app install flow.
- Replaced the actual manifest icon assets with valid PNG files featuring the existing Garden Atlas emblem. Preserved manifest scope, ID, standalone display, offline worker and all garden records.
- Added full payload decoding and integrity tests, plus browser-level `Image.decode()` checks. The previous PWA tests checked icon listings only and missed this regression.
- The new deployment is expected to fix one confirmed app-side installability blocker; Brave/Android physical install still requires user verification. Do not recommend clearing site data because the app stores gardens locally.

# Garden Atlas — P026 Editor Component Boundaries (2026-10-30)

- Refactored the existing object catalog into `src/components/ObjectCatalog.tsx`. Search and category filters now belong to the catalog instead of the top-level editor; object placement decisions remain in `App.tsx`.
- Added `src/components/ObjectIcon.tsx` for a shared, single sprite preview across the library and inspector.
- Extracted one placed object's SVG markup to `src/components/MapObject.tsx`; gestures, selection decisions, camera management, and garden mutations remain in `MapView.tsx`.
- Moved visual footprint and touch-target sizing into pure `src/mapObjectGeometry.ts` with regression tests covering zero measurements, rectangular objects and illustration scaling.
- Added Chromium coverage for object catalog filtering and existing inspector selection, alongside the prior boot/save/reload tests.
- No garden schema, dimensions, storage, geometry or artwork changes. Manual Android testing remains important; GitHub workflows are the production build gate.

---

# Garden Atlas — P025 Open-Source Readiness (2026-10-30)

- Public documentation, contributor guidance, security/privacy policy and release verification guide added. Full historical README preserved in `docs/history.md`.
- ESLint/Prettier configured; first Chromium smoke test exercises fresh load, editor canvas and IndexedDB save/reload.
- Changes are tooling/docs/tests only; runtime garden v6, model, storage, drawing and UI are preserved.
- See GitHub Actions for exact commit build/test/deployment status. Browser tests on Chromium do not substitute for manual Android gesture and storage QA.

---

# P024 — Editor Component Boundaries & Quality Gates (2026-10-30)

This maintenance patch keeps all garden tools, pixel art, version-6 data and storage algorithms unchanged. It begins splitting the main editor into smaller UI responsibilities:

- `src/components/EditorHeader.tsx` owns the app title, save status and top-level file controls.
- `src/components/GardenProjectsPanel.tsx` owns garden selection and backup/recovery controls, while receiving **all** mutations as callbacks from `App.tsx`.
- `src/components/MobileNavigation.tsx` owns mobile navigation markup; scrolling logic stays in `App.tsx`.
- `src/utils/backup.ts` centralizes existing JSON download naming and browser download behavior.
- `.editorconfig`, `.nvmrc` and `scripts/checkQuality.mjs` standardize basic file hygiene and the supported Node runtime. `npm run check:quality` is added to the deploy workflow and a new PR validation workflow checks source, tests and build.
- Three architecture regression tests supplement the existing suite; source-based tests were adjusted to follow components after extraction.

**Limitations:** CI must confirm the React/TypeScript build. No new npm dependencies were introduced; the repository still lacks a checked-in dependency lockfile and a full ESLint/Prettier configuration. Large `App.tsx` and `MapView.tsx` are not yet fully decomposed. Manual mobile and real-browser test coverage remains future work.

---

# P023 — Data Integrity & Cross-Tab Save Safety (2026-10-30)

This is a safety/maintenance-only patch; it adds no garden features or art and does not change the version-6 garden schema.

- IndexedDB now distinguishes missing saved data from malformed existing records. Damaged records block editing and cannot be replaced by automatic startup saves.
- The blocked screen allows exporting the visible fallback/recovery library and raw saved records, and requires explicit confirmation to repair. Corrupt rows are preserved under unique `damaged-*` keys before replacement.
- Each editor holds an IndexedDB revision. Every write checks the current revision inside the same read/write transaction. A competing tab causes a save conflict instead of a silent overwrite.
- Conflicted tabs retain their in-memory library for JSON export and must reload to resume editing. The localStorage fallback has best-effort cross-tab checking, not an atomic guarantee.
- First-run migration, legacy data and valid recovery snapshots remain supported, and old localStorage keys are not deleted.
- Added regression tests for corrupted storage, explicit recovery, overlapping editors, stale revisions and recovery conflict refusal.
- On-device recovery and multi-tab testing remains necessary; local automated Node tests are not a browser E2E substitute.

---

## P022 — Selection visibility & active-tool clarity (2026-10-30)

- Presentation-only polish: differentiate focused, multi-selected and group-highlighted objects with clearer outlines. Only the focused selected object shows its inline map name, preventing piles of overlapping labels in large groups.
- Reuse the existing under-map hint row for a compact active-tool label and concise guidance; stronger pressed state and accessible descriptive labels for all nine original map tools.
- In multi-select mode the existing selected-object strip shows a count and a shortcut back to the existing object list for bulk actions.
- Refined active quick-palette and touch layouts without increasing toolbar button size or moving map gestures.
- No model/schema, storage, PWA, paths, photos, selection semantics or imported-garden changes. Version-6 saved gardens and backups remain compatible.
- Added regression tests for tool completeness, selection focus and map UI wiring. Phone visual and touch QA still required.

# Garden Atlas — P021 Map Controls & Draft Safety (2026-10-29)

- Latest patch: **P021**, focused on drawing mode clarity and avoiding accidental loss of in-progress vertices.
- Existing modes (path, fence, border, terrain) show an action area from the start: instruction, progress, Finish, Undo Point, Clear.
- Unfinished drawings require confirmation before changing tools or switching the map presentation; Cancel keeps the draft. Keyboard Backspace removes one draft point, Escape clears the draft outside text inputs.
- Mobile drawing control layout is compact and touch friendly. No changes to garden v6, IndexedDB, PWA, imported images, other editing tools or saved records.
- The automated suite exercises current logic and guard wiring. GitHub Actions should validate the production build. Android interaction testing is still outstanding.

---

# Garden Atlas — P020 Editing & Navigation Polish (2026-10-29)

- **Existing UI/UX fixes only:** no new map tools, garden data fields, objects or storage changes.
- Renaming gardens and groups now accepts intermediate blank text and commits the finished valid name once on blur/Enter. Escape discards the draft; invalid empty names revert instead of trapping the keyboard. Object names follow the same interaction while retaining the previous allowance for empty labels.
- Switching gardens, restoring/importing gardens and creating/deleting projects now return the mobile view to the new garden map instead of leaving the user scrolled into a hidden Gardens panel.
- Tapping **EDIT POINTS** on an existing path/fence or terrain region from Objects now opens the map so the handles are visible without another navigation step.
- Narrow-screen path/fence item rows wrap their edit button, name, width and delete controls; touch targets are at least 44 px in the affected rows.
- All P019 garden records, IDs, map geometry, photos, version-6 JSON, IndexedDB saves, PWA and backup interfaces are preserved.
- Node regression tests and syntax checks pass locally; GitHub CI checks TypeScript and production build. Android physical-device usability remains unverified.

---

# Garden Atlas — P019 Inspector & Mobile Layout Polish (2026-10-29)

- Existing-feature UI/UX patch only. No changes to version-6 garden records, saved data, sprites, map editing tools, local storage, PWA, or import/export.
- Replaced tall inspector artwork preview with a compact selected-object heading and an explicit return-to-map action.
- Name, species/type, group, and editable width/length remain immediately visible. Existing pixel-art appearance, rotation, notes, position, and Plant Atlas records are organized under native keyboard-accessible expandable sections.
- Folded Plant Atlas is mounted on demand while the same specimen ID, history and actions are preserved; changing selected specimens creates fresh fold states.
- Map Size shortcut now opens the existing map settings and scrolls to the map frame, rather than jumping to the top of the document.
- Narrow-screen spacing, input touch targets, responsive identity fields and keyboard focus outlines improved.
- Physical Android touch and screen-reader verification remain necessary. Local tests and GitHub production build must pass before release claims.

---

# Garden Atlas — P018 Touch & Mobile Navigation Polish (2026-10-29)

- Current patch: **P018**. No new garden functions, objects, storage formats or data fields.
- Fixed three mobile UX problems: bottom tabs did not scroll to the selected panel, object selection happened on pointer-down even during a possible pinch, and drawing edges inserted vertices before a gesture was identified.
- The bottom bar now has MAP / OBJECTS / DETAILS / GARDENS and scrolls to the chosen section. Object-library presets jump to the canvas, with the keyboard dismissed when changing tabs.
- Movement thresholds in **screen pixels** filter touch jitter before committing moves or resizes; edges only insert points on confirmed taps and otherwise pan.
- P017 saved gardens and backups remain valid; garden v6, IndexedDB, PWA, other tools and their semantics are preserved.
- Validation: node regression tests and GitHub Pages production build. Android physical-device gesture quality still requires manual checks.

---

# Garden Atlas — P017 Editor UI/UX & Input Reliability (2026-10-29)

**Current patch: P017. Existing-feature polish only; garden schema v6 is unchanged.**

- Fixed the P016-inconsistent numeric entry experience for **path/fence widths**, **object rotation** and **reference-image width and coordinates**. Draft entry uses a numeric keyboard, allows blank/partial typing until blur or Enter, validates the finished value, and restores the saved value on invalid input or Escape. The object width/length editor from P016 remains unchanged.
- Existing path/fence width commits only once per completed edit, not at every intermediate keystroke, reducing accidental history entries and autosaves. New-drawing widths are also edited as drafts.
- Repaired mobile tool layout: removed conflicting `position:sticky; top:0` behavior from two toolbars that would obscure one another; retained all editor modes and existing quick palette.
- Added a compact selected-item strip immediately below the map with a clear **EDIT DETAILS** action; selecting an object in the object list also scrolls the Inspector into view. Tapping the map still keeps map navigation in place until explicitly opening Details.
- Mobile form fields use 16px font sizing for easier typing without unintended browser zoom. Selected item names truncate instead of pushing controls off-screen; touch targets remain around 42–48px.
- No changes to IndexedDB, service worker, the plant atlas data model, library migration or plot geometry. Manual Android device review is still required.

---

# Garden Atlas — P016 UI/UX Size & Toolbar Polish (2026-10-29)

**Current patch: P016. This patch fixes existing controls; it does not add garden-management features.**

- Inspector dimensions are now two independent editable measurements: **Width (X)** and **Length (Y)**, with map/print geometry kept in sync.
- Input values are committed when leaving the field or pressing Enter, so blank or intermediate `0` no longer snaps back while typing. `0` is accepted as **not measured**; the object stays visible through a minimum-size interactive marker.
- Legacy object records with only `diameterM` display their existing diameter for both axes. Optional `widthM`/`lengthM` preserve compatibility with v6 backups, with no data migration or changed ID/position.
- Selected objects can be resized in both dimensions from the existing on-map corner handle; resize remains one undoable edit.
- Main tool labels, quick placement strip, category buttons and preset previews are more compact, while keeping touch-friendly minimum heights.
- The P015 IndexedDB save path and offline service worker are untouched.
- Local checks: 63 passing tests; parsed changed TypeScript/JSX files. Full TypeScript and production build to be checked in GitHub CI due to missing local React/Vite dependencies.
- Manual Android verification still needed: keyboard entry, tool fit, orientation, save/reload and pinch/drag behavior.

---

# Garden Atlas — P015 Stabilization (2026-10-29)

Current release target: **P015 — storage integration and offline/save-status reliability**. No new garden features.

- Confirmed live P014 editor was still saving to localStorage despite the P013 IndexedDB module and its passing isolated tests. P015 connects asynchronous IndexedDB library loading and ordered saves to the actual editor.
- Editing is gated until the saved library is loaded; old localStorage keys remain intact for recovery.
- Explicit Saving / Saved / Save Failed states reflect completed writes, not merely queued work. A failed save warns the user and keeps the PWA update action disabled.
- Retained offline asset cache, old imports, v6 garden records, recovery snapshots and JSON backups.
- Remaining: manual Android offline/refresh/storage testing, multi-tab editing conflict prevention, original-resolution photo archives, and long-term backup resilience.

---

# P013 — IndexedDB Storage & Photo Safety

- Primary browser storage: IndexedDB `garden-atlas-offline` (version 1), snapshot store `libraries`; migration reads previous `localStorage` keys without deleting or overwriting them.
- Whole libraries saved as validated structured-clone records in transactions; asynchronous writes queued in edit order. The recent valid library is periodically stored in a separate recovery snapshot.
- Boot is asynchronous and editing UI waits for the load. `INDEXEDDB SAVED` / `SAVING / NOT SAVED` / fallback status makes persistence visible.
- Optional persistent-storage request and site-level usage estimate; neither guarantees durability after site data deletion. No automatic device sync or cross-tab editing coordination.
- Plant photos: eight optimized JPEGs per specimen, batch import, captions, removal, individual downloads. Backups contain the JPEG data as JSON; originals aren't retained.
- Model remains v6; existing P001–P012 garden/library backups are accepted without destructive conversion.
- Pending: original full-resolution media in separate IDB blob assets, ZIP backup with originals, cross-tab conflict handling, offline PWA/service worker, P013 physical-phone photo testing.

## P012 — Plant Atlas & Specimen Records (2026-10-29)
- Separate per-garden species encyclopedia entries from per-object specimen profiles; object IDs and coordinates unchanged.
- Identification confidence, planting date, observation history, maintenance history and photo captions for trees/shrubs/flowers.
- Up to three small, validated, compressed local JPEG photos per specimen; JSON garden/library backups include media.
- Print report includes species profiles, histories and attached photos.
- Optional fields preserve garden version 6; old P011 and older backups remain valid; no destructive migration.
- Browser `localStorage` quota remains a substantial limitation. Watch save status, export JSON backups; IndexedDB and richer care schedules remain future work.
- Local automated tests cover valid and invalid plant records, IDs, dates, photo validation, and P011 backward compatibility. GitHub Actions checks the full build.

# Garden Atlas — Project status

Current patch: **P011 — Pixel-art preset catalog**.

## Source-of-truth decision
- Scale and Illustration now display **the same** objects, coordinates, property boundary, ground regions, paths and fences.
- They remain different **visual presentations**: the measured grid vs the pixel-art environment. They do not represent independent garden designs.
- The project model is version **6**, with a single canonical `layout` and optional `object.position`.

## Data migration
- P001–P006 JSON backups and browser project-library saves are accepted using the preserved v5 legacy parser.
- A migration banner requires the user to choose **Scale** or **Illustration** as the shared source before editing.
- The **entire previous v5 garden** (including both old layouts and placements) remains in `linkMigration.original` and in subsequent JSON backups.
- The source-selection preview is non-destructive; confirmation only changes the editable shared layout.
- An **Export original pre-link maps** control remains available in My Gardens, even after confirmation.
- Import/export and local autosave remain browser-only. The original previous-browser library format remains recoverable through the retained archived data, but automatic save updates its library JSON to the current format.

## Undo / redo
- Clear controls near the map on both desktop and mobile.
- Desktop keyboard shortcuts: Cmd/Ctrl+Z, Cmd/Ctrl+Shift+Z, Cmd/Ctrl+Y, excluding native text-field editing.
- Continuous typing to a single field is consolidated into one undo step when keystrokes occur within a short burst.
- Non-text edits such as drawing a path, placing an object and moving a group remain one undo step each.
- Existing 40-state in-memory history remains session-local; it is not a replacement for JSON backups.

## Remaining roadmap
- P008: multi-select on the map, transform handles, snapping and alignment.
- P009: edit paths/fences/terrain after drawing, layer locking and reordering.
- P010: pixel art variants and custom object types.
- P011: richer encyclopedia and specimen records, dated maintenance and photos.
- P012: enriched printable reports, media storage and offline-PWA safety.

## Validation
- Model/storage/geometry/camera/history tests run with `npm test`.
- CI runs `npm test` then `npm run build` on `main` before GitHub Pages deployment.
- Actual mobile gesture testing remains important; automated tests do not prove a physical phone's touch feel.

## P008 — Workspace size discoverability and safer editing
- Dedicated MAP SIZE panel next to the canvas, available on mobile and desktop.
- Explicit preserve-measurements versus scale-everything resize choices.
- Workspace resize refuses to clip objects, plot boundary, terrain or lines.
- Add 10/25 metres of context around the garden without distorting geometry.
- Existing P007 version-6 garden data remains unchanged; no migration required.

## P010 — Existing feature edits, resize handles & layer locks
- Existing region and line geometry now has a map selection/edit tool. Vertices drag directly; edges insert vertices; selected vertices can be removed with validation and Undo.
- Selected individual garden objects expose a touch-sized resize handle; dimension values are validated before committing to one shared object.
- Separate visibility and temporary lock toggles for objects, terrain, paths/fences and boundary. Locks are editor-only state, not server permissions.
- No garden schema change: version 6 JSON, old backups and linked views remain compatible.
- 34 model tests pass locally, including four new feature geometry/resize tests. Full production build and phone testing require verification.
- Remaining: editable curved paths, terrain paint/brush, reordering layers, species library, photo galleries, IndexedDB and robust PDF book.

## P009 — Touch multi-edit and optional tracing reference
- Tap-to-multi-select on the map, bulk movement in one history step, bulk alignment/distribution/deletion, and optional 0.5 m snapping.
- Object rotation field for both visual styles.
- Local image import with in-browser JPEG compression, manual opacity/width/XY alignment, and shared viewing across both map styles.
- Image is saved in project JSON and exported backups; no cloud upload. Browser localStorage limits still apply.
- Reuse v6 data with optional validated fields, avoiding destructive conversion of existing gardens.
- Reference image is a tracing aid only, not an authenticated survey or GPS georeference.
- Remaining: direct reference image reposition gestures; photo galleries/IndexedDB; resizing handles, editable vertices on paths/fences/terrain, drawing layer lock/order and existing/planned garden variants.

## P011 — Pixel-art preset catalog
- Added 24 original vector-pixel object presets; category filtering and search in the mobile/desktop object toolbox.
- Added three object categories: rocks, ponds and garden furniture, retaining all five original object categories and their old default artwork.
- Preset placement and per-object appearance changes preserve ID, location, grouping, user-entered measurements and notes.
- Optional `presetId` extends v6 garden JSON without changing the schema version or requiring save migration.
- Both map modes and printable overview now render the selected preset artwork.
- 39 automated model tests pass locally; CI production build and physical-device interactions still require verification.
- Remaining priorities: user-customized sprite imports, higher-detail asset library, real/planned plans, planting/species encyclopedia, photos, maintenance history, IndexedDB storage and PWA offline support.

## P014 — Offline install / PWA
- Web app manifest, Android/iOS home-screen icons and service-worker caching of only final build files.
- Project-scoped offline navigation and editor assets; no runtime caching of arbitrary online content.
- Offline/online status, install instructions, opt-in update action, local-save guard and manual update check in My Gardens.
- Existing IndexedDB garden storage is unchanged; regular JSON backups remain important.
- Unit tests cover cache asset scope, cache revision on new build, offline navigation and manifest.
- Validate installability and offline editing manually on actual Android/iOS devices; CI alone cannot emulate an installed PWA.
