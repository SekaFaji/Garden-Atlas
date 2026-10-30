# Garden Atlas

A **local-first garden mapping and plant-record editor**, built with React 19, TypeScript, SVG and Vite. It is a responsive web app with offline support after the first successful visit.

**[Open Garden Atlas](https://sekafaji.github.io/Garden-Atlas/)** · [License](LICENSE) · [Contributing](CONTRIBUTING.md) · [Architecture](docs/architecture.md)

## What it does

- Create and manage gardens with two linked views: **Scale** (measured) and **Illustration** (pixel-art styling).
- Place, group, move, resize and label trees, plants, buildings, garden beds and other objects; edit boundaries, paths, fencing and terrain.
- Keep species information separate from individual plant records, with observations, maintenance notes and compressed photographs.
- Save local projects in IndexedDB, export/import JSON backups, and print a garden report.
- Install the web app to use its cached application shell offline. There is **no cloud account or automatic synchronization**.

All included example garden data is fictional. The app is a planning aid, not a land-survey or plant-identification service.

## Run locally

Requires Node.js **22.16.0** and npm 10 (see `.nvmrc` and `package.json`).

```bash
npm ci
npm run dev
```

The production app is configured for the `/Garden-Atlas/` URL path. Run `npm run build` and `npm run preview` to check the production build. The dependency lockfile is the source of truth; do not replace `npm ci` with `npm install` in CI.

## Validate changes

```bash
npm run check:quality
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

Browser tests use Playwright Chromium and may require `npx playwright install --with-deps chromium` on first use. See [Testing](docs/testing.md).

## Storage and privacy

Gardens, species histories and compressed photos stay in your browser storage, not in this GitHub repository. **Download JSON backups** before changing browsers, clearing site data or testing a development build. Browser data can be evicted; an app update is not an independent backup. P023 prevents automatic replacement of damaged records and detects competing-tab saves, but it does not synchronize tabs.

## Source guide

| Path | Responsibility |
| --- | --- |
| `src/model.ts`, `src/legacy.ts` | Garden schema (v6), validation and import compatibility |
| `src/storage.ts`, `src/browserStorage.ts` | Garden libraries, IndexedDB, recovery and conflict protection |
| `src/App.tsx`, `src/components/` | Editor orchestration and project/navigation presentation |
| `src/MapView.tsx`, `src/Sprite.tsx`, `src/VariantSprites.tsx` | SVG map, editing interactions and pixel art |
| `src/PlantAtlasPanel.tsx`, `src/plantAtlas.ts` | Plant records and species data |
| `scripts/offlineWorker.mjs` | Generates an offline cache worker during build |
| `tests/`, `e2e/` | Model/storage tests and real Chromium smoke tests |

Read [Architecture](docs/architecture.md), [Contributing](CONTRIBUTING.md), [Security](SECURITY.md) and [Release process](docs/releasing.md) before contributing. Older patch notes remain in [History](docs/history.md) and [Changelog](CHANGELOG.md).

## Limits

There is currently no server, online collaboration or cross-device sync. The SVG map uses a stylized projection, not an authoritative survey. IndexedDB recovery is best effort and does not replace exports. Real-phone testing remains important for touch gestures and browser storage behavior.

## License

[MIT](LICENSE). Original app code and included sprite source are released under this repository license. Third-party development dependencies carry their own licenses.
