import { test, devices } from '@playwright/test';

// Diagnostic only: browser-level installability and HTTP checks against the deployed GitHub Pages origin.
// This file runs in a clean profile and never reads or alters a real user's browser storage.
test.skip(!process.env.CHECK_LIVE_INSTALLABILITY, 'Live installability diagnostic is opt-in');

test('report exact live PWA installability failures in Chromium', async ({ browser }) => {
  test.setTimeout(50_000);
  const context = await browser.newContext({ ...devices['Pixel 7'] });
  const page = await context.newPage();
  const issues: string[] = [];
  page.on('console', message => { if (message.type() === 'error') issues.push(message.text().slice(0, 300)); });
  page.on('pageerror', error => issues.push(error.message.slice(0, 300)));
  const target = 'https://sekafaji.github.io/Garden-Atlas/';
  const response = await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 25_000 });
  const before = await page.evaluate(async () => {
    const link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    const manifestUrl = link?.href ?? null;
    const manifestResponse = manifestUrl ? await fetch(manifestUrl) : null;
    const manifest = manifestResponse?.ok ? await manifestResponse.json() : null;
    const icons = [];
    for (const icon of (manifest?.icons ?? [])) {
      const url = new URL(icon.src, manifestUrl!).href;
      const r = await fetch(url);
      const image = new Image(); image.src = url;
      let decode: string;
      try { await image.decode(); decode = `${image.naturalWidth}x${image.naturalHeight}`; }
      catch (e) { decode = String(e); }
      icons.push({url, status:r.status, type:r.headers.get('content-type'), bytes:(await r.arrayBuffer()).byteLength, decode});
    }
    const registration = await navigator.serviceWorker?.getRegistration('/Garden-Atlas/');
    return {url:location.href, manifestUrl, manifestStatus:manifestResponse?.status, manifestType:manifestResponse?.headers.get('content-type'), manifest, icons,
      hasSW:!!registration, swScope:registration?.scope, swState:registration?.active?.state ?? 'none',
      swScript:registration?.active?.scriptURL, hasController:!!navigator.serviceWorker?.controller};
  });
  // Allow the app's React effect to register and activate the worker, then reload to gain control.
  await page.waitForTimeout(3000);
  const serviceWorkerBeforeReload = await page.evaluate(async () => {
    const r = await navigator.serviceWorker?.getRegistration('/Garden-Atlas/');
    return {hasWorker:!!r,activeState:r?.active?.state,controller:!!navigator.serviceWorker?.controller};
  });
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForTimeout(1500);
  const session = await context.newCDPSession(page);
  await session.send('Page.enable');
  const appManifest = await session.send('Page.getAppManifest');
  const installability = await session.send('Page.getInstallabilityErrors');
  const after = await page.evaluate(()=>({url:location.href,controlled:!!navigator.serviceWorker?.controller,ready:document.readyState}));
  console.log('LIVE_PWA_INSTALLABILITY=' + JSON.stringify({httpStatus:response?.status(),before,serviceWorkerBeforeReload,after,manifestDevtools:appManifest,installability,consoleErrors:issues},null,2));
  await session.detach();
  await context.close();
});
