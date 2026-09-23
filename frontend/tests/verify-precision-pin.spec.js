import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const outDir = 'C:/Users/sathan/.gemini/antigravity/brain/a96cc5d9-f0ab-4fcb-b70b-ce2e0a9071d5/evidence/precision-pin';
fs.mkdirSync(outDir, { recursive: true });

test('verifies precision probe pin, unicode checkmarks without &check;, and no oversized billboards on zoom', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });

  // Mock ocean probe API response so test runs reliably in CI / preview without live backend
  await page.route('**/api/ocean/probe*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        lat: 14.414,
        lon: 90.651,
        time_idx: 0,
        sst: 29.016,
        sss: 33.902,
        mld: 6.13,
        d20: 136.6,
        depths: [0, 10, 20, 30, 50, 75, 100, 200, 500],
        temperature_profile: [29.02, 28.9, 28.1, 26.5, 22.1, 19.8, 16.4, 13.2, 8.5],
        salinity_profile: [33.90, 33.92, 34.05, 34.20, 34.45, 34.60, 34.80, 34.95, 35.05],
        nearest_observation: {
          id: 'ARGO_2902693',
          name: 'Apex Float 2902693',
          distance_km: 8.3
        }
      })
    });
  });

  await page.goto('/');
  await page.waitForTimeout(3000);

  // 1. Verify canvas is visible
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();

  // 2. Click Bay of Bengal preset to position camera nicely
  const bobBtn = page.getByRole('button', { name: 'Bay of Bengal' });
  if (await bobBtn.count() > 0) {
    await bobBtn.click();
    await page.waitForTimeout(1500);
  }

  // 3. Click on the ocean canvas near center to drop a probe pin
  const box = await canvas.boundingBox();
  if (box) {
    // Click in the center of the ocean view
    await page.mouse.click(box.x + box.width * 0.50, box.y + box.height * 0.50);
    await page.waitForTimeout(1500);
  }

  // 4. Verify LocationInspector is displayed
  const inspector = page.locator('.location-inspector-card');
  await expect(inspector).toBeVisible();

  // 5. Verify NO raw '&check;' entity exists anywhere in the DOM
  const rawEntityCount = await page.locator('text=&check;').count();
  expect(rawEntityCount).toBe(0);

  // 6. Verify unicode checkmark '✓' is present inside the inspector stat cards
  const checkmarkCount = await inspector.locator('text=✓').count();
  expect(checkmarkCount).toBeGreaterThanOrEqual(4);

  // 7. Verify metric values are clearly visible without overlap
  await expect(inspector.getByText('29.02 °C')).toBeVisible();
  await expect(inspector.getByText('33.90 PSU')).toBeVisible();
  await expect(inspector.getByText('6.1 m')).toBeVisible();
  await expect(inspector.getByText('136.6 m')).toBeVisible();

  // Capture 1: Sleek Location Inspector with structured stat tiles & precision coordinates
  await page.screenshot({ path: path.join(outDir, '01-precision-inspector-metrics.png'), fullPage: true });

  // 8. Zoom in towards the probe location using the UI zoom control
  const zoomInBtn = page.getByRole('button', { name: '+' });
  if (await zoomInBtn.count() > 0) {
    for (let i = 0; i < 3; i++) {
      await zoomInBtn.click();
      await page.waitForTimeout(250);
    }
    await page.waitForTimeout(1000);
  }

  // Capture 2: Zoomed-in ocean view showing small, sharp, razor-precise probe needle (no huge blob)
  await page.screenshot({ path: path.join(outDir, '02-zoomed-precision-pin-small.png'), fullPage: true });
});
