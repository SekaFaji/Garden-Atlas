# 🌿 Garden Atlas

**A pixel-art-inspired garden editor made with TypeScript, React, SVG, and Vite.** [Try the web app](https://sekafaji.github.io/Garden-Atlas/).

Garden Atlas helps you place and document trees, shrubs, flowers and structures on **two independent maps**: a measured Scale layout and a creative Illustration layout. Both maps reference the same object and group records. This is an early editor, not a professional survey application.

## P003 features

- Original pixel-block SVG sprites for trees, shrubs, flowers, garden beds and structures.
- **Touch-first movement:** tap an item, press **MOVE SELECTED**, then tap its destination. Select a group and use **MOVE GROUP** to move its placed members together. Mouse/pen dragging is still available.
- **Mobile-fitting map:** at 100% zoom, the map fits the content width; zooming enlarges the map for detailed work. Touch scrolling no longer triggers accidental placements.
- **Garden boundaries:** on either map, choose **EDIT OUTLINE**, select a numbered corner, then tap its new location; add and remove corners. Invalid self-crossing or collapsed polygons are rejected.
- **Ground style per map:** grass, soil, gravel or stone. This changes the whole plot's base texture, **not** elevation or multiple terrain zones.
- **Groups:** durable group IDs, shared notes, memberships, and selected-group movement.
- **Autosave:** project JSON stored locally in this browser with a limited previous-save recovery snapshot. A **NOT SAVED** indicator warns if browser storage fails.
- **User-owned gardens:** **EMPTY GARDEN** starts a blank project; **BACKUP** downloads a named, dated JSON file; **IMPORT** restores a JSON file after confirmation. Backups include the layout, objects and groups.
- **Compatibility:** P001 and P002 JSON/local browser saves migrate automatically to version 3 without losing specimen IDs, groups or saved positions. Old browser storage keys remain untouched.

## Quick start

1. Open the app on desktop or mobile. It starts with a **synthetic demonstration garden** unless this browser has a valid local save.
2. Choose **+ EMPTY GARDEN** (bottom of the Inspector) for your own project. Rename it using the garden-name field.
3. Choose Illustration or Scale. Use **EDIT OUTLINE**, select a corner by number, and tap the intended new location. **+ CORNER** subdivides a long edge.
4. Choose an object from the toolbox and tap the map to place it, or select an existing object and tap **MOVE SELECTED** before tapping a destination. Objects can be left unplaced in either mode.
5. Change the **GROUND** dropdown for this map. Objects and the other map's ground/outline are unchanged.
6. Use the Inspector to edit object information. Assign objects to groups with the Group selector.
7. When you've made useful progress, press **BACKUP** and save the JSON file. Import that file on another device or browser to continue there.

### Saving and privacy

Each browser origin/profile has its **own local garden data**, and edits are saved automatically to `localStorage`. The app has no login, server database or cloud sync. Browser data can be cleared, storage can be full/blocked, and different devices do **not** automatically share changes. Download regular JSON backups, especially before switching devices, clearing browser data or resetting a project. The local recovery snapshot is a limited safety net, **not** an external backup.

JSON backups may contain personal garden descriptions. The public repository includes only fake demonstration data, no real property survey or personal photos. Import replaces the current project in this browser **only after explicit confirmation**. Export your current garden first if you want to keep it.

### Current constraints

- The example workspace is fixed at **40 × 26 local units/metres**. You can draw non-rectangular plots inside that canvas, but cannot yet resize the world; larger or non-metric properties need a future patch.
- Scale measurements describe a flat local map with a 1-metre grid and approximate polygon area, not GPS, altitude, a cadastral survey or true slopes.
- Each map currently has a single ground style. Multiple soil/grass/path polygons, elevation, property resizing and true landscape measurements are planned for later.
- You can edit an outline independently in Scale and Illustration modes. Objects outside the outline remain in the project intentionally so no specimen disappears if you reshape the boundary.
- This prototype supports a single active garden per browser; use JSON backups to maintain multiple projects. The planned garden library, photo storage, encyclopedia, full offline-service-worker support and PDF garden book are not yet implemented.

## Development

Requires Node.js 20.19+ or 22.12+ and npm:

```bash
npm install
npm run dev
npm test
npm run build
```

The deployed build uses `base: '/Garden-Atlas/'` in Vite. `.github/workflows/deploy.yml` runs tests and a production build on pushes to `main`, then deploys to GitHub Pages when Pages is enabled under **Settings → Pages → GitHub Actions**.

## Data compatibility

Current format: `version: 3`, with `groups`, `objects`, and `layouts.scale` / `layouts.illustration` containing polygon boundaries and a ground style. Import validates every record. P001/P002 inputs receive default rectangular boundaries and grass without changing old object data. The new browser key is `garden-atlas:p003:v3`; older keys remain as migration fallbacks.

## Roadmap

Configurable world dimensions, terrain zones, scalable paths and shapes, richer touch gestures, undo/redo, multiple named gardens, species library, specimen photos, maintenance logs, layers, existing/planned scenarios and PDF generation.

Released as an open-source hobby project. Original artwork and no copied game assets.
