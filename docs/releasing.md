# Release and artifact verification

Every release must reference a **specific Git commit** and must have passing automated checks. Avoid packaging uncommitted local source or claiming a queued workflow is a successful deployment.

## Before a release

1. Run `npm ci`, `npm run check:quality`, `npm run lint`, `npm test`, `npm run build` and Chromium smoke tests.
2. Confirm the latest `main` Git commit matches the code being released. Check the GitHub Actions run for that exact commit, including Pages deployment.
3. Download an external garden backup before device-level tests. Release checks must not use private garden data in CI.

## Archive policy

- **Full source:** use GitHub's immutable commit archive (`https://github.com/OWNER/REPO/archive/<COMMIT_SHA>.zip`). Do not describe a `main` branch ZIP as immutable.
- **Patch-only:** include only files modified against the declared parent commit, using repository-relative paths. Additions must be present; intentional deletions must be clearly reported.
- Verify both archives can be opened and that each included source file has the same Git blob hash as its corresponding commit. Do not trust file names alone.
- Keep lockfiles and CI configuration inside the source archives. Never include `node_modules/`, private backups, local environment secrets or built `dist/` unless specifically producing a separate runtime artifact.

The static production build is a **separate artifact** uploaded and deployed by GitHub Actions. A source ZIP isn't the installed PWA.

## Automated source archives

`.github/workflows/release-archives.yml` packages both full and changed-file archives using `git archive` against committed trees. Update its `base` commit and `P###` label for each new patch; the archive generation fails if the comparison includes deleted files, rather than silently omitting deletions. GitHub Actions artifacts expire, so permanent downloads should link to immutable commit archives.
