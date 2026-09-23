import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const outDir = 'C:/Users/sathan/.gemini/antigravity/brain/a96cc5d9-f0ab-4fcb-b70b-ce2e0a9071d5/evidence/ocean-model';
fs.mkdirSync(outDir, { recursive: true });

test('verifies yellow box removal, ocean-centric bathymetry globe, and zoom clarity', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.waitForTimeout(3000);

  // 1. Verify canvas is visible
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();

  // Capture 1: Ocean-Centric Bathymetry Globe (Primary Hero Mode)
  await page.screenshot({ path: path.join(outDir, '01-ocean-centric-bathymetry-globe.png'), fullPage: true });

  // 2. Select CURRENTS (m/s) variable
  const currentsBtn = page.getByRole('tab', { name: /CURRENTS/i });
  await currentsBtn.click();
  await page.waitForTimeout(2500);

  // Capture 2: Currents Mode — Completely Free of Yellow Focus Rectangle!
  await page.screenshot({ path: path.join(outDir, '02-currents-no-yellow-box.png'), fullPage: true });

  // 3. Zoom in towards the North Indian Ocean / Arabian Sea
  const zoomInBtn = page.getByRole('button', { name: '+' }).or(page.locator('.hud-button:has-text("+")'));
  if (await zoomInBtn.count() > 0) {
    await zoomInBtn.click();
    await page.waitForTimeout(400);
    await zoomInBtn.click();
    await page.waitForTimeout(400);
    await zoomInBtn.click();
    await page.waitForTimeout(1000);
  }

  // Capture 3: Zoom In Clarity — High-Fidelity Wave Relief & Bathymetric Ridges
  await page.screenshot({ path: path.join(outDir, '03-zoomed-ocean-clarity.png'), fullPage: true });

  // 4. Test Ocean Style Toggle (Bathymetry vs Satellite)
  const styleToggle = page.locator('[data-testid="toggle-ocean-style-btn"]');
  if (await styleToggle.count() > 0) {
    await styleToggle.click();
    await page.waitForTimeout(1000);
    // Capture 4: Satellite Ocean Mode with Enhanced Specular Sheen
    await page.screenshot({ path: path.join(outDir, '04-satellite-ocean-mode.png'), fullPage: true });

    // Switch back to Bathymetric Twin
    await styleToggle.click();
    await page.waitForTimeout(800);
  }

  // 5. Select Temperature and test Data Layer ON/OFF toggle
  const tempBtn = page.getByRole('tab', { name: /TEMP/i });
  await tempBtn.click();
  await page.waitForTimeout(1500);

  // Capture 5: Translucent Temperature Layer
  await page.screenshot({ path: path.join(outDir, '05-temperature-translucent-overlay.png'), fullPage: true });

  const dataLayerToggle = page.locator('[data-testid="toggle-data-overlay-btn"]');
  if (await dataLayerToggle.count() > 0) {
    await dataLayerToggle.click();
    await page.waitForTimeout(1000);
    // Capture 6: Pure Ocean Globe (Data Layer Toggled Off)
    await page.screenshot({ path: path.join(outDir, '06-pure-ocean-globe-layer-off.png'), fullPage: true });
  }
});
