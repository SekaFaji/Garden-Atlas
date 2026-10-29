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
