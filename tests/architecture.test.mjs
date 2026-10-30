import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { gardenSlug } from '../src/utils/backup.ts';
import { qualityIssues } from '../scripts/checkQuality.mjs';

const read = file => readFile(new URL(file, import.meta.url), 'utf8');

test('P024 project controls are isolated but storage state stays in App', async () => {
  const [app, panel, header, mobile] = await Promise.all([
    read('../src/App.tsx'), read('../src/components/GardenProjectsPanel.tsx'),
    read('../src/components/EditorHeader.tsx'), read('../src/components/MobileNavigation.tsx'),
  ]);
  assert.match(app, /<GardenProjectsPanel/);
  assert.match(app, /<EditorHeader/);
  assert.match(app, /<MobileNavigation/);
  assert.match(panel, /onOpenProject\(p\.id\)/);
  assert.match(panel, /<OfflineTools saved=\{saved\}/);
  assert.match(header, /onBackup/);
  assert.match(mobile, /aria-current/);
  for (const module of [panel, header, mobile]) {
    assert.doesNotMatch(module, /from ['"]\.\.\/App['"]/);
    assert.doesNotMatch(module, /createBrowserWriter|approveBrowserRecovery/);
  }
  assert.match(app, /createBrowserWriter\(result\.backend,result\.revision\)/);
});

test('P024 backup filenames preserve the established garden slug rules', () => {
  assert.equal(gardenSlug('My French Garden'), 'my-french-garden');
  assert.equal(gardenSlug('  ! '), 'garden');
  assert.equal(gardenSlug('123'), '123');
  assert.ok(gardenSlug('a'.repeat(80)).length <= 50);
});

test('P024 hygiene check rejects missing, CRLF and unterminated source files', async () => {
  const root = await mkdtemp(join(tmpdir(), 'garden-atlas-quality-'));
  try {
    await Promise.all(['src', 'scripts', 'tests'].map(dir => mkdir(join(root, dir))));
    await writeFile(join(root, 'src', 'bad.ts'), 'export const x=1;\r\n');
    await writeFile(join(root, 'tests', 'unfinished.mjs'), 'const x = 2');
    const issues = await qualityIssues(root);
    assert.ok(issues.some(x => x.includes('CRLF line endings: src/bad.ts')));
    assert.ok(issues.some(x => x.includes('Missing final newline: tests/unfinished.mjs')));
    assert.ok(issues.some(x => x.includes('Missing required file: README.md')));
  } finally { await rm(root, { recursive: true, force: true }); }
});
