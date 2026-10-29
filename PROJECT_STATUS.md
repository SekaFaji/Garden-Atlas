# Garden Atlas — Project status

Current release: **P004 — Touch-first editor and workspace overhaul**

## Confirmed design
- TypeScript / React / SVG, pixel-art UI hosted on GitHub Pages; works on desktop and phone.
- One shared record per item; independently edited Scale and Illustration map placements.
- Map viewport and camera independent of the property's editable outline.
- Browser-local projects and JSON backup. No account, cloud sync or geographic survey claim.

## P004 implemented
- Pointer-based object drag, map panning, pinch/wheel zoom, fit/area, large touch targets, visible map selection.
- New polygon and freehand outline tools; direct vertex editing and arbitrary edge insertion.
- Resizable metric workspaces and independent ground terrain polygon regions.
- Duplicate, repeat-placement, groups and group dragging, show/hide layers, undo/redo.
- Up to 20 saved local garden projects, JSON garden or library import/export and a recovery snapshot.
- V1/V2/V3 garden migration; preserves old browser keys.

## Not implemented yet
- IndexedDB/media storage and photo attachments; real geospatial/altitude data.
- Existing/Planned layers, multi-select, fences with width, custom object symbols, plant encyclopedia and PDF garden book.
- Full phone-device touch regression testing; release automation build alone cannot guarantee gesture quality.

## Testing
- Node model/storage tests and GitHub Actions TypeScript build/deploy.
- Browser save and recovery must be tested after deployment on an actual phone.
