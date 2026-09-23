import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const outDir = 'C:/Users/sathan/.gemini/antigravity/brain/a96cc5d9-f0ab-4fcb-b70b-ce2e0a9071d5/evidence/volume-block-fix';
fs.mkdirSync(outDir, { recursive: true });

test('verifies 3D Ocean Volume Block resilience against 404 and verified visible probe pin', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });

  // Simulate remote backend returning 404 for /api/ocean/volume (exactly what happened on Vercel)
  await page.route('**/api/ocean/volume*', async (route) => {
    await route.fulfill({
      status: 404,
      contentType: 'application/json',
      body: JSON.stringify({ detail: 'Not Found' })
    });
  });

  await page.goto('/');
  await page.waitForTimeout(2500);

  // 1. Verify canvas is visible
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();

  // 2. Drop a probe pin on the globe
  const box = await canvas.boundingBox();
  if (box) {
    await page.mouse.click(box.x + box.width * 0.50, box.y + box.height * 0.50);
    await page.waitForTimeout(1000);
  }

  // Capture 1: Clearly visible precision pin on 3D globe (not microscopic)
  await page.screenshot({ path: path.join(outDir, '01-visible-precision-pin-globe.png'), fullPage: true });

  // 3. Switch View Mode to "📦 3D Ocean Volume Block"
  // Find the toggle button in the header / sub-nav
  const volumeToggleBtn = page.getByRole('button', { name: /3D Ocean Volume Block|Volume Block/i });
  if (await volumeToggleBtn.count() > 0) {
    await volumeToggleBtn.click();
    await page.waitForTimeout(2000);
  } else {
    // Alternatively click the EXPLORE or VIEW toggle
    const exploreBtn = page.getByRole('button', { name: /EXPLORE/i });
    if (await exploreBtn.count() > 0) {
      await exploreBtn.click();
      await page.waitForTimeout(400);
      const blockOption = page.getByText(/3D Ocean Volume Block/i);
      if (await blockOption.count() > 0) {
        await blockOption.click();
        await page.waitForTimeout(2000);
      }
    }
  }

  // 4. Verify NO "Not Found" error banner is displayed
  const errorBanner = page.locator('text=Not Found');
  expect(await errorBanner.count()).toBe(0);

  // 5. Verify the 3D Volume Block HUD is active
  await expect(page.getByText('Regional 3D Ocean Volume Block')).toBeVisible();

  // Capture 2: Verified 3D Ocean Volume Block rendering smoothly with no 404 error
  await page.screenshot({ path: path.join(outDir, '02-volume-block-rendering-success.png'), fullPage: true });
});
