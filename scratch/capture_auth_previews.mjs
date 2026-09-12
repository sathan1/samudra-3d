import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const outDir = path.resolve('D:/Studies/SIH/Samudra 3D/docs/evidence/operational-auth');
fs.mkdirSync(outDir, { recursive: true });

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log('Navigating to http://127.0.0.1:4175 ...');
  await page.goto('http://127.0.0.1:4175');
  await page.waitForTimeout(2500);

  // 1. Capture Official Dashboard Overview
  await page.screenshot({ path: path.join(outDir, '01-official-dashboard-moes-incois.png'), fullPage: true });
  console.log('Captured 01-official-dashboard-moes-incois.png');

  // 2. Open Login Portal
  await page.locator('[data-testid="open-login-btn"]').click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(outDir, '02-operational-login-modal-personas.png'), fullPage: true });
  console.log('Captured 02-operational-login-modal-personas.png');

  // 3. Quick-Login as Chief Oceanographer
  await page.locator('[data-testid="persona-chip-chief_oceanographer"]').click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outDir, '03-chief-oceanographer-authenticated.png'), fullPage: true });
  console.log('Captured 03-chief-oceanographer-authenticated.png');

  // 4. Open Modal again to inspect active session card
  await page.locator('[data-testid="open-login-btn"]').click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(outDir, '04-active-session-credentials.png'), fullPage: true });
  console.log('Captured 04-active-session-credentials.png');

  // 5. Sign Out and switch to Naval Operations
  await page.locator('[data-testid="login-signout-btn"]').click();
  await page.waitForTimeout(800);
  await page.locator('[data-testid="persona-chip-naval_operations"]').click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outDir, '05-naval-operations-tactical.png'), fullPage: true });
  console.log('Captured 05-naval-operations-tactical.png');

  await browser.close();
  console.log('All operational authentication preview captures completed.');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
