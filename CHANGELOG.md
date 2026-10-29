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
