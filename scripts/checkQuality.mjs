/** Zero-dependency repository hygiene checks, run before tests and builds. */
import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const SKIP = new Set(['node_modules', 'dist', '.git']);
const ROOT_FILES = ['README.md', 'LICENSE', 'package.json', 'tsconfig.json', '.editorconfig', '.nvmrc'];
const REQUIRED_COMPONENTS = ['src/components/EditorHeader.tsx', 'src/components/GardenProjectsPanel.tsx', 'src/components/MobileNavigation.tsx'];

export async function qualityIssues(root = ROOT) {
  const problems = [];
  async function checkFile(path) {
    const source = await readFile(join(root, path), 'utf8').catch(() => null);
    if (source === null) { problems.push(`Missing required file: ${path}`); return; }
    if (!source.endsWith('\n')) problems.push(`Missing final newline: ${path}`);
    if (source.includes('\r\n')) problems.push(`CRLF line endings: ${path}`);
    if (path.startsWith('src/components/') && /from\s+['"]\.\.\/App['"]/.test(source)) {
      problems.push(`UI component must not import App: ${path}`);
    }
  }
  for (const file of [...ROOT_FILES, ...REQUIRED_COMPONENTS]) await checkFile(file);
  async function walk(directory) {
    for (const entry of await readdir(join(root, directory), { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (SKIP.has(entry.name)) continue;
      if (entry.isDirectory()) await walk(path);
      else if (entry.isFile() && /\.(?:ts|tsx|mjs)$/.test(entry.name)) await checkFile(relative(root, join(root, path)));
    }
  }
  for (const directory of ['src', 'scripts', 'tests']) {
    if ((await stat(join(root, directory)).catch(() => null))?.isDirectory()) await walk(directory);
    else problems.push(`Missing source directory: ${directory}`);
  }
  return problems;
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const issues = await qualityIssues();
  if (issues.length) { for (const issue of issues) console.error(issue); process.exitCode = 1; }
  else console.log('Repository hygiene checks passed.');
}
