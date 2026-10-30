# Security and privacy

Garden Atlas is a **browser-only app** that stores potentially personal garden records and photos locally. GitHub Pages serves the application shell; the app does not include accounts or a cloud sync service.

## Report vulnerabilities privately

If the repository has GitHub's private vulnerability reporting enabled, use **Security → Report a vulnerability**. If unavailable, open a public issue requesting a private contact channel **without including exploit steps, secrets, private data or identifying details**. Do not post real garden backups or photos in issues.

## Storage safety

- Browser site data is not a durable external backup. Export JSON backups frequently and keep them outside browser storage.
- A restore or corrupted IndexedDB record can contain sensitive information. Avoid attaching it to public bug reports.
- Don't test storage migrations with your only copy of a real garden. Use fictional sample data and a fresh browser profile.
- Changes to imports, photo processing, cross-tab saving and PWA updates need explicit tests and review.

The project does not currently promise a formal vulnerability response SLA or support encrypted backups. See the [Architecture](docs/architecture.md) for current storage design.
