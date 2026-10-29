# Garden Atlas — Project status

Current patch: **P003 — Mobile Controls, Garden Outline & Backup Safety**

## Core decisions
- Public TypeScript + React + SVG pixel-art-inspired web app, deployed to GitHub Pages.
- Mobile and desktop editing in the browser, no hosting/backend for user garden data.
- Scale and Illustration keep independent positions and outlines; both share object/group records.
- User-controlled local autosaving and JSON backups. No automatic cross-device sync.
- Public sample property data is synthetic, not the user's real property survey.

## Implemented
- Pixel SVG objects, editable shared records, drag-and-place controls, group creation and movement.
- Touch-first tap-to-move action for objects and groups; scroll-friendly, mobile-fitting map.
- Polygon plot per mode with selectable corners, add/remove, invalid polygon rejection, area in Scale mode.
- Whole-plot ground style per mode: grass/soil/gravel/stone.
- Blank garden option; JSON import/export, autosaving and limited local previous-save recovery.
- P001/P002 → P003 model migration using new browser key; prior saved keys preserved.
- 19 model tests verifying groups, migration, geometry, storage and independence.

## Known limitations
- Plot editor works only inside fixed sample 40 × 26 m canvas; not arbitrary garden dimensions yet.
- Only one polygon and one ground texture per map; slopes, elevation and internal patches are not modeled.
- Browser storage is not durable after clearing site data, and isn't synchronized across devices. Download JSON backups.
- Touch drag gestures intentionally use tap-to-move for reliability; mouse/pen can drag.
- No browser-based screenshot test in the automated model test suite.

## Planned
- Configurable map dimensions, region painting, path/fence polygons, undo/redo and layers.
- Multi-garden library, IndexedDB photo support, plant encyclopedia, care histories.
- Existing/planned scenarios and PDF garden-book export.

## Deployment
`main` is the requested release branch. GitHub Actions runs tests, production build and GitHub Pages deployment. Check workflow status before claiming a release is live.
