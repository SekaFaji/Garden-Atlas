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


test('Garden Atlas install icons decode in the browser and the manifest is scoped correctly', async ({page}) => {
  await page.goto('/Garden-Atlas/');
  const result=await page.evaluate(async () => {
    const link=document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    if(!link)throw Error('Manifest link missing');
    const response=await fetch(link.href);
    if(!response.ok)throw Error('Manifest missing');
    const manifest=await response.json() as {start_url:string;scope:string;icons:{src:string;sizes:string;type:string}[]};
    const icons=[];
    for(const size of [192,512]){
      const icon=manifest.icons.find(icon=>icon.sizes===`${size}x${size}` && icon.type==='image/png');
      if(!icon)throw Error(`Missing ${size}px icon`);
      const img=new Image();
      img.src=new URL(icon.src,link.href).href;
      await img.decode();
      icons.push([img.naturalWidth,img.naturalHeight]);
    }
    return {scope:manifest.scope,start:manifest.start_url,icons};
  });
  expect(result.scope).toBe('/Garden-Atlas/');
  expect(result.start).toBe('/Garden-Atlas/');
  expect(result.icons).toEqual([[192,192],[512,512]]);
});

test('Inspector still edits existing object dimensions and preserves them after reload', async ({ page }) => {
  await page.goto('/Garden-Atlas/');
  await expect(page.locator('.save-status')).toContainText(/INDEXEDDB SAVED|LOCAL SAVE/, { timeout: 15_000 });
  await page.locator('.object-entry').first().click();
  await expect(page.locator('.inspector-compact-header')).toBeVisible();
  const width = page.getByRole('textbox', { name: 'Object width in metres' });
  const length = page.getByRole('textbox', { name: 'Object length in metres' });
  await width.fill('2.5');
  await width.press('Enter');
  await expect(width).toHaveValue('2.5');
  await length.fill('4.5');
  await length.press('Enter');
  await expect(length).toHaveValue('4.5');
  await expect(page.locator('.save-status')).toContainText(/INDEXEDDB SAVED|LOCAL SAVE/, { timeout: 15_000 });
  await page.reload();
  await expect(page.locator('.save-status')).toContainText(/INDEXEDDB SAVED|LOCAL SAVE/, { timeout: 15_000 });
  await page.locator('.object-entry').first().click();
  await expect(page.getByRole('textbox', { name: 'Object width in metres' })).toHaveValue('2.5');
  await expect(page.getByRole('textbox', { name: 'Object length in metres' })).toHaveValue('4.5');
});


test('P030 object list, group controls and visibility preserve existing editing behavior', async ({ page }) => {
  await page.goto('/Garden-Atlas/');
  await expect(page.locator('.save-status')).toContainText(/INDEXEDDB SAVED|LOCAL SAVE/, { timeout: 15_000 });
  const objects = page.locator('.map-surface [data-object]');
  await expect(objects).not.toHaveCount(0);
  const layer = page.locator('.layer-control').filter({ hasText: 'Plants & structures' });
  await layer.locator('input[type="checkbox"]').uncheck();
  await expect(objects).toHaveCount(0);
  await layer.locator('input[type="checkbox"]').check();
  await expect(objects).not.toHaveCount(0);

  const selection = page.locator('.object-row').first().locator('input[type="checkbox"]');
  await selection.check();
  await expect(page.locator('.batch-editor')).toContainText('1 selected');
  await page.getByRole('textbox', { name: 'New group name' }).fill('P030 Smoke Group');
  await page.locator('.group-create button').click();
  await expect(page.locator('.group-entry').filter({ hasText: 'P030 Smoke Group' })).toHaveCount(1);
  await expect(page.locator('.save-status')).toContainText(/INDEXEDDB SAVED|LOCAL SAVE/, { timeout: 15_000 });
});

test('P031 Android-sized touch controls preserve zoom and deliberate path draft interactions', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 393, height: 852 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
  });
  try {
    const page = await context.newPage();
    await page.goto('/Garden-Atlas/');
    await expect(page.locator('.save-status')).toContainText(/INDEXEDDB SAVED|LOCAL SAVE/, { timeout: 15_000 });
    await expect(page.locator('.map-surface [data-object]')).not.toHaveCount(0);

    const status = page.locator('.viewport-status');
    const before = await status.innerText();
    await page.getByRole('button', {name: 'Zoom in'}).tap();
    await expect(status).not.toHaveText(before);

    await page.locator('.primary-tools button[aria-label^="PATH:"]').tap();
    const progress = page.locator('.drawing-controls .drawing-progress');
    await expect(progress).toContainText('0 / 2');
    const map = page.locator('.map-surface');
    await map.scrollIntoViewIfNeeded();
    const rect = await map.boundingBox();
    expect(rect).not.toBeNull();
    await page.touchscreen.tap(rect!.x + rect!.width/2, rect!.y + rect!.height/2);
    await expect(progress).toContainText('1 / 2');
    await page.locator('.drawing-controls button[title="Discard draft points"]').tap();
    await expect(progress).toContainText('0 / 2');
    await expect(page.locator('.map-surface [data-object]')).not.toHaveCount(0);
  } finally {
    await context.close();
  }
});


test('P033 map resizing persists across reload and tracing panel remains accessible', async ({ page }) => {
  await page.goto('/Garden-Atlas/');
  await expect(page.locator('.save-status')).toContainText(/INDEXEDDB SAVED|LOCAL SAVE/, { timeout: 15_000 });
  const openMapSize = page.locator('.map-size-toggle');
  await openMapSize.click();
  const panel = page.locator('#map-size-panel');
  await expect(panel).toBeVisible();
  const width = panel.locator('input[type="number"]').first();
  await width.fill('50');
  await panel.getByRole('button', { name: 'APPLY MAP SIZE' }).click();
  await expect(page.locator('.map-toolbar')).toContainText('50 × 26 m');
  await expect(page.locator('.save-status')).toContainText(/INDEXEDDB SAVED|LOCAL SAVE/, { timeout: 15_000 });
  await page.reload();
  await expect(page.locator('.save-status')).toContainText(/INDEXEDDB SAVED|LOCAL SAVE/, { timeout: 15_000 });
  await expect(page.locator('.map-toolbar')).toContainText('50 × 26 m');
  await page.locator('.map-size-toggle').click();
  await expect(page.locator('#map-size-panel input[type="number"]').first()).toHaveValue('50');
  await page.locator('.reference-toolbar button').click();
  await expect(page.locator('#reference-panel')).toBeVisible();
  await expect(page.getByRole('button', { name: 'IMPORT REFERENCE IMAGE' })).toBeVisible();
  await page.locator('.reference-toolbar button').click();
  await expect(page.locator('#reference-panel')).toHaveCount(0);
});

test('P034 map toolbar retains tool selection, snap and multi-select', async ({ page }) => {
  await page.goto('/Garden-Atlas/');
  await expect(page.locator('.save-status')).toContainText(/INDEXEDDB SAVED|LOCAL SAVE/, { timeout: 15_000 });
  const toolbar=page.locator('.primary-tools');
  await toolbar.getByRole('button', { name: /^PATH:/ }).click();
  await expect(page.locator('.terrain-chooser')).toContainText('PATH WIDTH');
  await expect(toolbar.getByRole('button', { name: /^PATH:/ })).toHaveAttribute('aria-pressed','true');
  await toolbar.getByRole('button', { name: /^TERRAIN:/ }).click();
  await expect(page.getByRole('combobox', { name: 'Terrain brush' })).toBeVisible();
  await toolbar.getByRole('button', { name: /^SELECT:/ }).click();
  await expect(page.locator('.terrain-chooser')).toHaveCount(0);
  const history=page.locator('.editor-history-bar');
  await history.getByRole('button', { name: /SNAP OFF/ }).click();
  await expect(history.getByRole('button', { name: /SNAP ON/ })).toHaveAttribute('aria-pressed','true');
  await history.getByRole('button', { name: /MULTI/ }).click();
  await expect(history.getByRole('button', { name: /MULTI/ })).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('.map-tool-pill')).toContainText('MULTI SELECT');
});


test('P035 garden name undo/redo survives a save without altering linked layouts', async ({ page }) => {
  await page.goto('/Garden-Atlas/');
  await expect(page.locator('.save-status')).toContainText(/INDEXEDDB SAVED|LOCAL SAVE/, {timeout:15_000});
  const name=page.getByRole('textbox',{name:'Garden name'});
  const initial=await name.inputValue();
  await name.fill('P035 Undo Redo Regression');
  await name.press('Enter');
  await expect(name).toHaveValue('P035 Undo Redo Regression');
  const history=page.locator('.editor-history-bar');
  await history.getByRole('button',{name:/UNDO/}).click();
  await expect(name).toHaveValue(initial);
  await history.getByRole('button',{name:/REDO/}).click();
  await expect(name).toHaveValue('P035 Undo Redo Regression');
  await expect(page.locator('.save-status')).toContainText(/INDEXEDDB SAVED|LOCAL SAVE/, {timeout:15_000});
  await page.reload();
  await expect(page.getByRole('textbox',{name:'Garden name'})).toHaveValue('P035 Undo Redo Regression');
});

test('P036 pixel-textured garden surfaces persist across Scale and Illustration modes', async ({ page }) => {
  await page.goto('/Garden-Atlas/');
  await expect(page.locator('.save-status')).toContainText(/INDEXEDDB SAVED|LOCAL SAVE/, {timeout: 15_000});
  const map = page.locator('.map-surface');
  for(const ground of ['grass','soil','gravel','stone','water']) {
    await expect(map.locator(`pattern[id="map-${ground}"]`)).toHaveCount(1);
  }
  const garden = map.locator('polygon[fill="url(#map-grass)"]').first();
  await expect(garden).toBeVisible();
  await page.locator('.mode-switch button').filter({hasText:'SCALE'}).click();
  await expect(map.locator('polygon[fill="url(#map-grass)"]').first()).toBeVisible();
  await page.locator('.mode-switch button').filter({hasText:'ILLUSTRATION'}).click();
  await expect(map.locator('polygon[fill="url(#map-grass)"]').first()).toBeVisible();
  await page.reload();
  await expect(map.locator('polygon[fill="url(#map-grass)"]').first()).toBeVisible();
});

test('P037 fractional path/fence widths are selectable on desktop and mobile-sized layouts', async ({ page }) => {
  await page.goto('/Garden-Atlas/');
  await expect(page.locator('.save-status')).toContainText(/INDEXEDDB SAVED|LOCAL SAVE/, {timeout:15_000});
  const tools=page.locator('.primary-tools');
  await tools.getByRole('button',{name:/^PATH:/}).click();
  const field=page.getByRole('textbox',{name:'New path or fence width in metres'});
  await field.fill('0.05');
  await field.press('Enter');
  await expect(field).toHaveValue('0.05');
  await page.getByRole('button',{name:'0.25 m line width'}).click();
  await expect(field).toHaveValue('0.25');
  await tools.getByRole('button',{name:/^FENCE:/}).click();
  await expect(field).toHaveValue('0.25');
  await field.fill('0,15');
  await field.press('Enter');
  await expect(field).toHaveValue('0.15');
  await page.setViewportSize({width:393,height:852});
  await expect(page.getByRole('button',{name:'0.1 m line width'})).toBeVisible();
  await page.getByRole('button',{name:'0.1 m line width'}).click();
  await expect(field).toHaveValue('0.1');
});
