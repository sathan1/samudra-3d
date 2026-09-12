import { test } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const outDir = path.resolve('..', 'docs', 'evidence', 'solid-globe-auth');
fs.mkdirSync(outDir, { recursive: true });

test('captures high-resolution evidence for solid Google Earth globe & backside visibility', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.waitForTimeout(3000);

  // 1. Clean Front-Side Globe (Indian Ocean Basin)
  await page.screenshot({ path: path.join(outDir, '01-clean-natural-globe-front.png'), fullPage: true });

  // 2. Rotate globe 180 degrees to Pacific Ocean / Americas (Back Side)
  const canvas = page.locator('[data-testid="three-canvas-container"]');
  const box = await canvas.boundingBox();
  if (box) {
    const startX = box.x + box.width * 0.75;
    const startY = box.y + box.height * 0.5;
    const endX = box.x + box.width * 0.15;
    const endY = box.y + box.height * 0.5;

    // First rotation drag
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(endX, endY, { steps: 20 });
    await page.mouse.up();
    await page.waitForTimeout(800);

    // Second rotation drag to reach full Pacific / Americas backside
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(endX, endY, { steps: 20 });
    await page.mouse.up();
    await page.waitForTimeout(1500);
  }

  // Capture Solid Backside (Americas & Pacific)
  await page.screenshot({ path: path.join(outDir, '02-solid-earth-pacific-backside.png'), fullPage: true });

  // 3. Open Officer Login Modal
  await page.locator('[data-testid="open-login-btn"]').click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(outDir, '03-sqlite-database-auth-modal.png'), fullPage: true });
});
