# Garden Atlas — Project status

Current patch: **P007 — Linked Scale/Illustration views & safer edit history**.

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
