# 🌿 Garden Atlas

**A pixel-art-inspired garden map editor built with TypeScript, React, SVG, and Vite.**

> P001 is an early interactive prototype, not a finished landscape surveying tool. Its bundled garden is **synthetic sample data**, not anyone's private property.

## Current features (P001)

- **Two maps, one set of records:** Scale and Illustration modes keep independent placements for the same garden objects.
- **Original pixel-block SVG sprites:** trees, shrubs, flowers, beds and structures (no copied game assets).
- **Interactive editing:** select, drag, add, rename, resize, describe and delete objects.
- **Shared object details:** name, species/type, group label and notes. Grouping operations are not implemented yet.
- **Scale map:** 40 × 26 metre *sample canvas*, with 1 metre grid lines and 0.5 metre placement snapping. Scale measurements currently describe a flat plan, not geospatial surveying data.
- **Illustration map:** independent freeform placements and a decorated sample background.
- **Local save and JSON backup:** data is saved in browser storage, with explicit import/export for portability.
- **Responsive UI:** desktop inspector/sidebar; mobile-friendly stacked layout and a scrollable/zoomable map.

## Run locally

Prerequisites: Node.js 20.19+ or 22.12+, npm.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. Build with:

```bash
npm test
npm run build
npm run preview
```

## GitHub Pages

The application has Vite `base: '/Garden-Atlas/'` configured for `https://sekafaji.github.io/Garden-Atlas/`. A GitHub Actions workflow in `.github/workflows/deploy.yml` builds and publishes the `dist` directory. Enable **Settings → Pages → Build and deployment → GitHub Actions** if it is not already enabled. Every push to `main` will trigger the deployment workflow once Actions/Pages permissions permit it.

## Using the editor

1. Choose **Illustration** or **Scale** above the map.
2. Select an object in the toolbox, then tap/click an empty spot on the map to place it. The corresponding object remains *unplaced* on the other map until explicitly positioned there.
3. Click/tap an item or use the item list; drag it within the current map. Its shared record remains unchanged in the other mode.
4. Edit its name, species, group label, dimensions or notes in the inspector.
5. Use **Backup** to save a JSON file, and **Import** to restore one.

**Important:** Automatic browser storage is not a safe long-term backup by itself. Back up your JSON file, especially before clearing site data or switching browsers/devices. The app intentionally has no backend, account or cloud sync.

## Data & privacy

- All records are stored locally in the current browser's `localStorage` (P001 foundation only).
- Exported JSON can contain garden descriptions or other personal information; only share it if you intend to.
- The repository contains **no real property survey, address, parcel polygon or private photos**.
- Existing JSON format is versioned (`version: 1`). Future migrations must preserve existing garden records.
- Browser storage limits may apply. Photo attachments and larger galleries will require IndexedDB in later patches.

## Planned, not yet implemented

Polygon/curve drawing; proper physical grouping; layers; planted/real versus planned states; calibrated measurements; photo/species encyclopedia; maintenance history; richer mobile gestures; undo/redo; PDF garden book; import/export of entire media libraries.

## Design principles

- One stable record ID per garden object; placements belong separately to each map mode.
- Accurate map coordinates are never overwritten by freeform illustration edits.
- Offline first, no account required, transparent local data ownership.
- Incremental numbered patches with small, reviewable changes.

Made for hobby gardeners and small garden projects. The artwork, code and sample layout are original to this repository.
