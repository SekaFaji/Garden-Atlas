# Garden Atlas — Project status

Current patch: **P001**

## Decisions locked in
- Public TypeScript web app; GitHub Pages and mobile browsers are primary targets.
- Pixel-art-inspired vector visuals.
- One shared set of specimen/object records with **independent Scale and Illustration placements**.
- Scale mode is metrically meaningful; illustration mode is freeform.
- Offline first; users own their data and can export backups.
- Real garden may be offered as a showcase later, but the initial repository ships synthetic sample data.

## Current scope
Basic interactive map editor, shared record inspector, JSON backup/import, responsive shell.

## Not yet implemented
- True gardens/projects library; editable property boundaries; multi-point shapes; layer manager.
- Physical grouping (a string group label is available only for records).
- Separate existing/planned scenarios, custom assets, photos, specimen observations.
- PDF garden book and data-driven plant encyclopedia.

## Repository deployment
The GitHub Actions workflow deploys on pushes to `main`, provided the GitHub Pages site is configured and the Actions job has deployment permission. It does not publish itself without a successful workflow run.
