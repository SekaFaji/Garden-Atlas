import { expect, test } from '@playwright/test';

test('a fresh browser can load the garden editor and show its map', async ({ page }) => {
  await page.goto('/Garden-Atlas/');
  await expect(page.locator('.brand-name')).toContainText('GARDEN');
  await expect(page.locator('.map-surface')).toBeVisible();
  await expect(page.locator('.save-status')).toContainText(/INDEXEDDB SAVED|LOCAL SAVE/, { timeout: 15_000 });
});

test('a garden name survives a full reload in IndexedDB', async ({ page }) => {
  await page.goto('/Garden-Atlas/');
  await expect(page.locator('.save-status')).toContainText(/INDEXEDDB SAVED|LOCAL SAVE/, { timeout: 15_000 });
  const name = page.getByRole('textbox', { name: 'Garden name' });
  await expect(name).toBeVisible();
  const unique = 'Garden Atlas Smoke Test';
  await name.fill(unique);
  await name.press('Enter');
  await expect(name).toHaveValue(unique);
  await expect(page.locator('.save-status')).toContainText(/INDEXEDDB SAVED|LOCAL SAVE/, { timeout: 15_000 });
  await page.reload();
  await expect(page.getByRole('textbox', { name: 'Garden name' })).toHaveValue(unique, { timeout: 15_000 });
  await expect(page.locator('.save-status')).toContainText(/INDEXEDDB SAVED|LOCAL SAVE/, { timeout: 15_000 });
});

test('catalog filters presets and selecting a map object opens its existing inspector', async ({ page }) => {
  await page.goto('/Garden-Atlas/');
  await expect(page.locator('.save-status')).toContainText(/INDEXEDDB SAVED|LOCAL SAVE/, { timeout: 15_000 });
  const search = page.getByRole('searchbox', { name: 'Search garden objects' });
  await search.fill('greenhouse');
  await expect(page.locator('.preset-button')).toHaveCount(1);
  await search.fill('');
  await expect(page.locator('.preset-button')).toHaveCount(24);
  const first = page.locator('.object-entry').first();
  await first.click();
  await expect(page.locator('.inspector-compact-header')).toBeVisible();
  await expect(page.locator('.map-surface [data-object]')).not.toHaveCount(0);
});
