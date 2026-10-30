# Testing

Run all commands from the repository root on Node.js 22.16.0 and npm 10:

```bash
npm ci
npm run check:quality
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install --with-deps chromium
npm run test:e2e
```

The model tests run without a browser; they verify schema compatibility, editing helpers and IndexedDB logic with mocks. **Passing them alone does not prove real browser storage or gestures work.** The Playwright smoke tests run Chromium against the built production app and test a new browser profile.

## Manual release checks (especially Android)

1. Back up a real garden before starting, and use a fictional test garden whenever possible.
2. Load, create and rename a garden. Confirm the save label completes, reload and check persistence.
3. Select, move and resize objects; undo/redo; edit path vertices; switch Scale/Illustration and inspect both maps.
4. Add one plant observation and a small photo, then export and re-import JSON in a separate browser profile.
5. Check touch scroll, pinch-zoom, selection and keyboard inputs on a narrow screen.
6. Visit once online, then reload with network disabled after the service worker is ready.
7. Open a second tab, edit the same garden, and confirm stale edits are **blocked**, not silently overwritten.
8. With **disposable data only**, test recovery prompts and backups after a deliberately malformed stored record.

Record actual device, browser, test result and any data risks in each PR. Never publish user-specific gardens or backups.

## P026 UI regression checks

`tests/mapObjectGeometry.test.mjs` verifies rectangular footprint dimensions, zero-measurement drawing and hit-target scaling without requiring a browser. The browser smoke suite also searches the object catalog, checks category results, and selects an existing garden object to open the Inspector. These tests are complementary: neither replaces testing touch gestures on an Android device.
