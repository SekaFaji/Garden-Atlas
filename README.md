# 🌿 Garden Atlas

**A pixel-art-inspired garden map editor built with TypeScript, React, SVG, and Vite.**

> P002 is an early interactive prototype, not a finished landscape surveying tool. Its bundled garden is **synthetic sample data**, not anyone's private property.

## Current features (P002)

- **Two maps, one set of records:** Scale and Illustration modes keep independent placements for the same garden objects.
- **Original pixel-block SVG sprites:** trees, shrubs, flowers, beds and structures (no copied game assets).
- **Interactive editing:** select, drag, add, rename, resize, describe and delete objects.
- **Editable groups:** create and rename groups, maintain group notes, assign existing objects and select members. Selecting a group highlights its placed members; drag a highlighted item to move the entire group in the active layout.
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
4. Use the **GROUPS** section to create a group. Assign an object to it using the inspector GROUP dropdown. Select a group in the sidebar to edit its name/notes and see members; drag any highlighted member to move the whole group in the current map.
5. Edit each object’s name, species, dimensions and notes in the inspector.
6. Use **Backup** to save a JSON file, and **Import** to restore one (including P001 backups).

**Important:** Automatic browser storage is not a safe long-term backup by itself. Back up your JSON file, especially before clearing site data or switching browsers/devices. The app intentionally has no backend, account or cloud sync.

## Data & privacy

- All records are stored locally in the current browser's `localStorage` (P001 foundation only).
- Exported JSON can contain garden descriptions or other personal information; only share it if you intend to.
- The repository contains **no real property survey, address, parcel polygon or private photos**.
- Current JSON format is `version: 2`. P001 (`version: 1`) JSON is automatically migrated on import or first local load. The older P001 browser key is intentionally left intact during upgrade.
- Browser storage limits may apply. Photo attachments and larger galleries will require IndexedDB in later patches.

## Planned, not yet implemented

Polygon/curve drawing; hedge/path shape grouping; layers; planted/real versus planned states; calibrated measurements; photo/species encyclopedia; maintenance history; richer mobile gestures; undo/redo; PDF garden book; import/export of entire media libraries.

## Data compatibility

P001 saves grouped items with plain-text labels. P002 converts each distinct label to a stable group ID, retains object IDs and both map positions, and saves to a **new** localStorage key. Export a new JSON backup after upgrading. This is still a single-garden prototype.

## Design principles

- One stable record ID per garden object; placements belong separately to each map mode.
- Accurate map coordinates are never overwritten by freeform illustration edits.
- Offline first, no account required, transparent local data ownership.
- Incremental numbered patches with small, reviewable changes.

Made for hobby gardeners and small garden projects. The artwork, code and sample layout are original to this repository.
