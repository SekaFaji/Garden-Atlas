# Contributing to Garden Atlas

Thank you for helping improve Garden Atlas. The project is MIT licensed and accepts issues, bug reports, docs improvements and focused pull requests.

## Set up

1. Install Node.js 22.16.0 and npm 10.
2. Fork and clone the repository, then run `npm ci`.
3. Start the editor with `npm run dev`.
4. Run `npm run check:quality`, `npm run lint`, `npm test` and `npm run build` before submitting a change.
5. For UI/storage changes, run the Chromium smoke tests (`npm run test:e2e`) and manually test a narrow mobile screen.

## Changes and pull requests

- Keep each PR focused. Explain what changed, the reason, screenshots for UI changes and commands actually run.
- Preserve **garden schema v6**, stable object/specimen identifiers and JSON import/export compatibility unless a schema migration is explicitly proposed and tested.
- Do not use someone else's real garden, photographs, personal data or geographic coordinates as fixtures. The checked-in demo must remain fictional.
- Treat IndexedDB, recovery, backup and offline changes as data-safety work. Add regression coverage and document any migration or possible data loss.
- Keep React components responsible for UI, share data transforms as testable functions, and avoid unrelated reformatting of historical code.
- Prefer accessible controls, mobile touch targets and predictable keyboard behavior. Use descriptive names and explain non-obvious decisions, not every line.
- Never commit `node_modules/`, `dist/`, `.env` files or a personal garden backup.

## Reporting bugs

Include steps to reproduce, expected/actual behavior, browser and OS versions and whether the app is installed. Do **not** include identifying garden screenshots, private photographs, backup JSON or addresses in public issues. See [Security](SECURITY.md) for sensitive reports.

## Review and releases

Pull requests run quality checks and browser smoke tests. Maintainers review risky changes before merge. Builds and release archives should be tied to a specific commit; see [Release process](docs/releasing.md).
