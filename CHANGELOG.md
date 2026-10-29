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
