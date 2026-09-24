import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const evidenceDir = path.resolve('test-results', 'screenshots');
mkdirSync(evidenceDir, { recursive: true });

test.describe('Oceanographic 3D View, Coordinate Graticules & Zoom Visualization', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 950 });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Indian Ocean workspace' })).toBeVisible();
    await page.locator('.subtle-tag', { hasText: '3D Thermal Layer Active' }).waitFor({ timeout: 5000 }).catch(() => {});
  });

  test('1. 3D Coordinate Graticules and Basin Feature Labels toggling', async ({ page }) => {
    const graticulesBtn = page.locator('[data-testid="toggle-graticules-btn"]');
    const basinLabelsBtn = page.locator('[data-testid="toggle-basin-labels-btn"]');

    // Both buttons should be visible in globe mode
    await expect(graticulesBtn).toBeVisible();
    await expect(basinLabelsBtn).toBeVisible();

    // Default states: Graticules is ON, Basin labels is ON
    await expect(graticulesBtn).toContainText('🌐 Grid');
    await expect(basinLabelsBtn).toContainText('🏷️ Basins');

    // Screenshot 1: Oceanographic view with Graticules and Basins active
    await page.screenshot({ path: path.join(evidenceDir, '01-graticules-and-basins-active.png'), fullPage: true });

    // Toggle graticules off and on
    await graticulesBtn.click();
    await page.waitForTimeout(300);
    await graticulesBtn.click();
    await page.waitForTimeout(300);

    // Toggle basin labels off and on
    await basinLabelsBtn.click();
    await page.waitForTimeout(300);
    await basinLabelsBtn.click();
    await page.waitForTimeout(300);
  });

  test('2. Zoom controls and Basin Zoom toolbar navigation', async ({ page }) => {
    const zoomInBtn = page.locator('[data-testid="zoom-in-btn"]');
    const zoomOutBtn = page.locator('[data-testid="zoom-out-btn"]');

    await expect(zoomInBtn).toBeVisible();
    await expect(zoomOutBtn).toBeVisible();

    // Click Zoom In twice
    await zoomInBtn.click();
    await page.waitForTimeout(200);
    await zoomInBtn.click();
    await page.waitForTimeout(300);

    // Screenshot 2: Zoomed in view
    await page.screenshot({ path: path.join(evidenceDir, '02-zoomed-in-ocean-view.png'), fullPage: true });

    // Click Zoom Out
    await zoomOutBtn.click();
    await page.waitForTimeout(300);

    // Basin Zoom Bar Presets
    const arabianSeaZoom = page.locator('[data-testid="zoom-basin-arabian"]');
    const bayOfBengalZoom = page.locator('[data-testid="zoom-basin-bob"]');
    const equatorialZoom = page.locator('[data-testid="zoom-basin-equator"]');
    const fullOceanZoom = page.locator('[data-testid="zoom-basin-global"]');

    await expect(arabianSeaZoom).toBeVisible();
    await expect(bayOfBengalZoom).toBeVisible();
    await expect(equatorialZoom).toBeVisible();
    await expect(fullOceanZoom).toBeVisible();

    // Zoom into Arabian Sea
    await arabianSeaZoom.click();
    await page.waitForTimeout(900); // Wait for smooth camera lerp
    await page.evaluate(() => window.scrollTo(0, 0));

    // Screenshot 3: Arabian Sea focused zoom
    await page.screenshot({ path: path.join(evidenceDir, '03-arabian-sea-basin-focus.png'), fullPage: true });

    // Zoom into Bay of Bengal
    await bayOfBengalZoom.click();
    await page.waitForTimeout(900);
    await page.evaluate(() => window.scrollTo(0, 0));

    // Screenshot 4: Bay of Bengal focused zoom
    await page.screenshot({ path: path.join(evidenceDir, '04-bay-of-bengal-basin-focus.png'), fullPage: true });

    // Reset to Full Ocean
    await fullOceanZoom.click();
    await page.waitForTimeout(900);
    await page.evaluate(() => window.scrollTo(0, 0));

    // Screenshot 5: Full Ocean Basin view
    await page.screenshot({ path: path.join(evidenceDir, '05-full-ocean-basin-restored.png'), fullPage: true });
  });
});
