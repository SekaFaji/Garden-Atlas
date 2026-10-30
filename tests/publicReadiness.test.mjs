import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const repoFile = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
test('public entrypoint and contributor/security guidance exist', async () => {
  for (const path of ['README.md', 'CONTRIBUTING.md', 'SECURITY.md', 'CODE_OF_CONDUCT.md', 'docs/architecture.md', 'docs/testing.md', 'docs/releasing.md']) {
    assert.ok((await repoFile(path)).trim().length > 100, path);
  }
  assert.match(await repoFile('README.md'), /synthetic|fictional/i);
  assert.match(await repoFile('SECURITY.md'), /private/i);
});
test('browser tests use a fresh local app and never production/private data', async () => {
  const spec = await repoFile('e2e/editor.spec.ts');
  const config = await repoFile('playwright.config.ts');
  assert.match(spec, /page\.goto\('\/Garden-Atlas\/'\)/);
  assert.match(spec, /page\.reload\(\)/);
  assert.match(config, /127\.0\.0\.1/);
  assert.ok(!spec.includes('sekafaji.github.io'));
});
