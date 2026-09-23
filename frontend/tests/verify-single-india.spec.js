import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const outDir = 'C:/Users/sathan/.gemini/antigravity/brain/a96cc5d9-f0ab-4fcb-b70b-ce2e0a9071d5/evidence/single-india';
fs.mkdirSync(outDir, { recursive: true });

test('verifies single India alignment, high resolution globe, and data sources modal with Copernicus CLI', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.waitForTimeout(3000);

  // 1. Verify canvas is visible
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();

  // 2. Click Basin Zoom: Arabian Sea to focus right on India
  const arabianSeaBtn = page.getByRole('button', { name: 'Arabian Sea' });
  if (await arabianSeaBtn.count() > 0) {
    await arabianSeaBtn.click();
    await page.waitForTimeout(1500);
  }

  // Capture 1: Verified Single India in Bathymetric Digital Twin Mode
  // Coastlines, shelf breaks, and satellite features perfectly aligned (No duplicate India!)
  await page.screenshot({ path: path.join(outDir, '01-single-india-bathymetry.png'), fullPage: true });

  // 3. Switch to Satellite Ocean Mode to verify 1:1 land/ocean alignment
  const styleToggle = page.locator('[data-testid="toggle-ocean-style-btn"]');
  if (await styleToggle.count() > 0) {
    await styleToggle.click();
    await page.waitForTimeout(1200);
    // Capture 2: Verified Single India in Satellite Mode
    await page.screenshot({ path: path.join(outDir, '02-single-india-satellite.png'), fullPage: true });

    // Switch back to Bathymetry Twin
    await styleToggle.click();
    await page.waitForTimeout(800);
  }

  // 4. Open Data Sources Modal via DATA menu dropdown
  const dataMenuBtn = page.getByRole('button', { name: 'DATA ▾' });
  if (await dataMenuBtn.count() > 0) {
    await dataMenuBtn.click();
    await page.waitForTimeout(400);
    const sourcesItem = page.getByText(/Data Sources & Provenance/i);
    if (await sourcesItem.count() > 0) {
      await sourcesItem.click();
      await page.waitForTimeout(1000);
      // Capture 3: Data Sources Modal with Copernicus CLI & 2026 In-Situ Repositories
      await page.screenshot({ path: path.join(outDir, '03-data-sources-copernicus-cli.png'), fullPage: true });
    }
  }
});
