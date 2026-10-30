/** Reproducible full and changed-files archives from committed Git trees. */
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const [base, label = 'P025', output = 'release'] = process.argv.slice(2);
if (!base || !/^P\d{3}$/.test(label)) {
  console.error('Usage: node scripts/createReleaseArchives.mjs <parent-commit> P025 [output-dir]');
  process.exit(2);
}
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const head = git('rev-parse', 'HEAD');
if (!/^[0-9a-f]{40}$/.test(head) || !/^[0-9a-f]{40}$/.test(base)) throw Error('Use exact commit SHAs');
execFileSync('git', ['merge-base', '--is-ancestor', base, head]);
const changed = git('diff', '--name-only', '--diff-filter=ACMR', base, head).split('\n').filter(Boolean);
const deleted = git('diff', '--name-only', '--diff-filter=D', base, head).split('\n').filter(Boolean);
const folder = resolve(output);
mkdirSync(folder, { recursive: true });
const full = resolve(folder, `Garden_Atlas_${label}_FULL.zip`);
const patch = resolve(folder, `Garden_Atlas_${label}_PATCH.zip`);
execFileSync('git', ['archive', '--format=zip', `--output=${full}`, head]);
if (changed.length) execFileSync('git', ['archive', '--format=zip', `--output=${patch}`, head, '--', ...changed]);
else throw Error('No changed files to package');
if (deleted.length) throw Error(`Patch archive cannot express deletions without a manifest: ${deleted.join(', ')}`);
console.log(JSON.stringify({ base, head, label, changed, full, patch }, null, 2));
