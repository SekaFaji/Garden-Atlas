# Changelog

## P001 — Pixel Garden Editor Foundation (2026-10-29)

- Scaffolded a TypeScript + React + Vite web app for the Garden Atlas repository.
- Added a responsive dark green pixel-inspired editor with five original SVG object sprites.
- Added object placement, drag, selection, editing, deletion and stable record IDs.
- Added independent Scale and Illustration map positions sharing one object record.
- Added a measured sample grid (40 × 26 metres) with placement snapping.
- Added local browser saving and import/export of validated JSON backups.
- Added a synthetic demonstration garden with no personal property data.
- Added four automated model tests and a GitHub Pages deployment workflow.

### Known limits

- PDF generation, polygon drawing, real grouping, advanced map panning, photographs, and the plant encyclopedia are planned, not implemented.
- Coordinates are a flat local plan; not a geographic survey or a georeferenced parcel.
- LocalStorage is a prototype store, not guaranteed durable storage. Export regular backups.
- Browser interface and production Vite build require dependency installation and should be verified after npm access is available.

## P002 — Editable Garden Groups (2026-10-29)

- Introduced permanent group IDs, editable group names and shared group notes.
- Added Create Group, group library, group inspector and member navigation.
- Replaced free-text per-object group labels with a group selector for linked membership.
- Selecting a group highlights its placed members; dragging any highlighted member moves the whole group in the active map, preserving their relative spacing and respecting map bounds.
- Kept Scale and Illustration placements independent, including when moving groups.
- Added v1→v2 import and local-save migration; the original P001 localStorage key is retained as a fallback backup.
- Added model tests for migration, references, boundary clamping, group deletion and independent layout behavior.

### Notes

- A group contains shared object records; it is not yet a drawable hedge line or a terrain polygon.
- Group movement operates on already-placed objects in the current map only. An unplaced object is placed individually.
- Photos, layers, advanced shape drawing and printable garden books remain future patches.

## P003 — Mobile Controls, Garden Outline & Backup Safety (2026-10-29)

- Added touch-friendly tap-to-move controls and map-width fitting at 100% zoom. Desktop mouse/pen drag is retained.
- Added polygon outline editing per map with indexed corners and add/remove tools; invalid boundary edits are rejected.
- Added configurable whole-plot ground styles: grass, soil, gravel and stone, independent by map mode.
- Added new blank garden creation without demo content, plus clear browser-autosave and backup/recovery messaging.
- Improved JSON backup naming and P001/P002 data migration into `version: 3`; retained older browser storage keys.
- Added limited previous-save browser recovery fallback for an invalid current save; downloadable JSON is still the essential backup.
- Expanded the model test suite to 19 passing tests. Fixed malformed-key fallback and boundary edge intersection handling.

### P003 limitations

- The workspace remains fixed at 40 × 26, so the plot outline is editable only within that space.
- Ground style applies to the whole plot, not multiple terrain regions, slopes or elevations.
- LocalStorage and previous-save recovery cannot survive browser data clearing or guarantee no data loss; export JSON regularly.
- P003 is not a finished landscape surveying tool; full UI/device interaction must be verified after GitHub Pages deployment.
