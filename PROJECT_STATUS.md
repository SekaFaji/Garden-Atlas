# Garden Atlas — Project status

Current patch: **P002**

## Confirmed project decisions
- Public TypeScript + React web app, hosted through GitHub Pages and compatible with mobile browsers.
- Pixel-art-inspired scalable SVG visuals.
- Shared object records and independent Scale/Illustration placements.
- Scale mode uses local metre coordinates; Illustration mode is freeform.
- Offline-first local data, explicit JSON backups, and no account requirement.
- Public sample data is synthetic, not a copy of a private property survey.

## Implemented through P002
- Interactive map, sprite toolbox, drag-and-drop object placement, shared record inspector.
- Garden groups with stable IDs, name and notes, membership assignments, member navigation.
- Active-map group dragging while preserving member spacing and the untouched alternate map.
- Versioned v2 JSON format; P001 local data and backups can be migrated without losing records.
- Local autosave and import/export.

## Planned but not implemented
- Actual property boundaries, polygon/path drawing, precise calibration, editable object art variants.
- Layer controls, undo/redo, existing/planned scenarios, multi-garden library.
- Species encyclopedia, specimen photos and observation histories.
- Garden book PDF creation and maintenance planner.

## Deployment
`main` is the requested release branch. `.github/workflows/deploy.yml` runs tests and build on every push and attempts a GitHub Pages deployment. A Pages URL is only ready after a successful GitHub Actions workflow.
