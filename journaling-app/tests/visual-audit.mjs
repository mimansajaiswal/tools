import { chromium } from '/tmp/journaling-playwright/node_modules/playwright/index.mjs';

const appUrl = process.env.JOURNALING_APP_URL || 'http://127.0.0.1:8000/journaling-app/';
const executablePath = '/Users/mimansajaiswal/Library/Caches/ms-playwright/chromium_headless_shell-1148/chrome-mac/headless_shell';
const routes = [
  'write',
  'library',
  'journals',
  'reflect',
  'insights',
  'highlights',
  'tags',
  'people',
  'map',
  'templates',
  'reminders',
  'health',
  'transcribe'
];
const consoleErrors = [];

function assert(condition, message, details = undefined) {
  if (!condition) throw new Error(details ? `${message}: ${JSON.stringify(details, null, 2)}` : message);
}

async function visibleRoute(page, route) {
  return page.locator(`.workspace-section[data-view="${route}"]`).evaluateAll((nodes) => nodes.some((node) => {
    const style = getComputedStyle(node);
    return style.display !== 'none' && style.visibility !== 'hidden';
  }));
}

async function assertNoOverflow(page, label) {
  const offenders = await page.evaluate(() => Array.from(document.querySelectorAll('body *')).filter((node) => {
    if (node.classList.contains('sr-only') || node.closest('.sr-only') || node.closest('.leaflet-container')) return false;
    if (document.body.dataset.rightPanelHidden === 'true' && node.closest('.rail-right')) return false;
    if (document.body.dataset.leftRailOpen === 'false' && innerWidth <= 640 && node.closest('.rail-left')) return false;
    const style = getComputedStyle(node);
    if (style.display === 'none' || style.visibility === 'hidden' || style.position === 'fixed') return false;
    const rect = node.getBoundingClientRect();
    return rect.right > innerWidth + 2 || rect.left < -2;
  }).slice(0, 8).map((node) => ({
    tag: node.tagName.toLowerCase(),
    className: String(node.className || ''),
    text: String(node.textContent || '').trim().slice(0, 80),
    left: node.getBoundingClientRect().left,
    right: node.getBoundingClientRect().right,
    width: node.getBoundingClientRect().width
  })));
  assert(offenders.length === 0, `${label} viewport overflow`, offenders);
}

async function captureRoute(page, route, viewportName) {
  const actualRoute = route === 'journals' ? 'journals' : route;
  await page.goto(`${appUrl}?audit=${Date.now()}#${actualRoute}`, { waitUntil: 'networkidle' });
  await page.waitForFunction((view) => Array.from(document.querySelectorAll(`.workspace-section[data-view="${view}"]`)).some((node) => {
    const style = getComputedStyle(node);
    return style.display !== 'none' && style.visibility !== 'hidden';
  }), route);
  if (route === 'map') await page.waitForTimeout(1200);
  assert(await visibleRoute(page, route), `${route} did not render as the active view`);
  await assertNoOverflow(page, `${route}-${viewportName}`);
  const metrics = await page.evaluate(() => {
    const active = Array.from(document.querySelectorAll('.workspace-section')).find((node) => {
      const style = getComputedStyle(node);
      return style.display !== 'none' && style.visibility !== 'hidden';
    });
    const rect = active?.getBoundingClientRect();
    return {
      activeId: active?.id || '',
      top: rect?.top || 0,
      left: rect?.left || 0,
      width: rect?.width || 0,
      height: rect?.height || 0,
      bodyWidth: document.body.scrollWidth,
      viewportWidth: innerWidth
    };
  });
  assert(metrics.bodyWidth <= metrics.viewportWidth + 2, `${route} body width overflows viewport`, metrics);
  const path = `/tmp/journaling-route-audit-${route}-${viewportName}.png`;
  await page.screenshot({ path, fullPage: true });
  return { route, viewportName, path, metrics };
}

const context = await chromium.launchPersistentContext(`/tmp/journaling-audit-profile-${Date.now()}`, {
  executablePath,
  headless: true,
  serviceWorkers: 'block',
  viewport: { width: 1440, height: 1050 }
});

try {
  const page = context.pages()[0] || await context.newPage();
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(error.stack || String(error)));

  const desktop = [];
  for (const route of routes) {
    desktop.push(await captureRoute(page, route, 'desktop'));
  }

  await page.setViewportSize({ width: 430, height: 1050 });
  const mobile = [];
  for (const route of routes) {
    mobile.push(await captureRoute(page, route, 'mobile'));
  }

  assert(consoleErrors.length === 0, 'Browser console/page errors occurred', consoleErrors);
  console.log(JSON.stringify({
    ok: true,
    desktopCount: desktop.length,
    mobileCount: mobile.length,
    screenshots: [...desktop, ...mobile].map((item) => item.path)
  }, null, 2));
} finally {
  await context.close();
}
