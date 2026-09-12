import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const outDir = path.resolve('D:/Studies/SIH/Samudra 3D/docs/evidence/solid-globe-auth');
fs.mkdirSync(outDir, { recursive: true });

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log('Navigating to http://localhost:5173 ...');
  await page.goto('http://localhost:5173');
  await page.waitForTimeout(3000);

  // 1. Capture Clean Front-Side Globe (Indian Ocean & Natural UI)
  await page.screenshot({ path: path.join(outDir, '01-clean-natural-globe-front.png'), fullPage: true });
  console.log('Captured 01-clean-natural-globe-front.png');

  // 2. Rotate globe by dragging across the canvas to show the Pacific Ocean / Americas (Back Side)
  const canvas = page.locator('[data-testid="three-canvas-container"]');
  const box = await canvas.boundingBox();
  if (box) {
    const startX = box.x + box.width * 0.7;
    const startY = box.y + box.height * 0.5;
    const endX = box.x + box.width * 0.15;
    const endY = box.y + box.height * 0.5;

    // Drag to rotate horizontally 180 degrees
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(endX, endY, { steps: 25 });
    await page.mouse.up();
    await page.waitForTimeout(1500);

    // Another drag to ensure full Pacific / Americas view
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(endX, endY, { steps: 25 });
    await page.mouse.up();
    await page.waitForTimeout(2000);
  }

  await page.screenshot({ path: path.join(outDir, '02-solid-earth-pacific-backside.png'), fullPage: true });
  console.log('Captured 02-solid-earth-pacific-backside.png');

  // 3. Open Official SQLite Database Login Modal
  await page.locator('[data-testid="open-login-btn"]').click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outDir, '03-sqlite-database-auth-modal.png'), fullPage: true });
  console.log('Captured 03-sqlite-database-auth-modal.png');

  await browser.close();
  console.log('All solid globe & auth evidence captures completed successfully.');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
