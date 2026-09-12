import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const evidenceDir = path.resolve('..', 'docs', 'evidence', 'phase-05');
mkdirSync(evidenceDir, { recursive: true });

// Sample slice payload matching backend/sample_data/model_indian_ocean.nc
const mockSliceData = {
  variable: 'temperature',
  units: 'degC',
  time_idx: 0,
  timestamp: '2026-09-10T00:00:00Z',
  requested_depth: 0.0,
  selected_depth: 0.0,
  shape: [5, 5],
  lats: [0.0, 5.0, 10.0, 15.0, 20.0],
  lons: [65.0, 70.0, 75.0, 80.0, 85.0],
  values: [
    [29.1, 29.0, 28.9, 28.8, 28.7],
    [29.0, 28.9, 28.8, 28.7, 28.6],
    [28.9, 28.8, null, 28.6, 28.5], // null for Indian peninsula masking
    [28.8, 28.7, null, 28.5, 28.4],
    [28.7, 28.6, 28.5, 28.4, 28.3]
  ],
  min_val: 28.3,
  max_val: 29.1,
  missing_count: 2,
  valid_count: 23
};

test.describe('Phase 05: 3D Scalar Temperature Field Rendering', () => {

  test('AC04, AC05 & AC07: Scalar field loads, renders on globe, and displays thermal legend', async ({ page }) => {
    // Intercept ocean-data route to provide consistent deterministic test slice
    await page.route('**/api/ocean-data*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockSliceData)
      });
    });

    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto('/');

    // Check header and phase badge
    await expect(page.getByRole('heading', { name: '3D Indian Ocean Globe' })).toBeVisible();
    await expect(page.locator('.phase-label')).toContainText('OPERATIONAL');

    // Check 3D Thermal Layer Active tag
    const tag = page.locator('.subtle-tag', { hasText: '3D Thermal Layer Active' });
    await expect(tag).toBeVisible({ timeout: 5000 });

    // Check Viewport HUD info badge
    const layerBadge = page.locator('.hud-badge', { hasText: 'LAYER:' });
    await expect(layerBadge).toBeVisible();
    await expect(layerBadge).toContainText('28.3');
    await expect(layerBadge).toContainText('29.1');

    // Check ColorBarLegend is active with thermal gradient
    const legend = page.locator('.legend-active');
    await expect(legend).toBeVisible();
    await expect(legend).toContainText(/temperature/i);
    await expect(legend).toContainText('28.3');
    await expect(legend).toContainText('29.1');

    // Ensure Three.js WebGL canvas is rendering
    const canvas = page.locator('.globe-canvas-wrapper canvas');
    await expect(canvas).toBeVisible();

    await page.waitForTimeout(1000);

    // Capture primary screenshot of rendered scalar layer on the globe
    await page.screenshot({
      path: path.join(evidenceDir, '01-scalar-field-surface.png'),
      fullPage: true
    });

    // Test OrbitControls rotation
    const canvasBox = await canvas.boundingBox();
    const cx = canvasBox.x + canvasBox.width / 2;
    const cy = canvasBox.y + canvasBox.height / 2;

    await page.mouse.move(cx, cy);
    await page.mouse.down({ button: 'left' });
    await page.mouse.move(cx - 150, cy - 40, { steps: 10 });
    await page.mouse.up({ button: 'left' });

    await page.waitForTimeout(500);

    // Capture rotated view screenshot
    await page.screenshot({
      path: path.join(evidenceDir, '02-scalar-field-rotated.png'),
      fullPage: true
    });

    // Reset camera view
    await page.getByRole('button', { name: 'Reset View' }).click();
    await page.waitForTimeout(500);
  });

  test('AC07: Handles API failure gracefully with honest error state and retry recovery', async ({ page }) => {
    let failRequest = true;

    // Intercept and conditionally fail
    await page.route('**/api/ocean-data*', async (route) => {
      if (failRequest) {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ detail: 'Internal ocean server error' })
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockSliceData)
        });
      }
    });

    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto('/');

    // Check error tag and error banner in HUD
    const errorTag = page.locator('.subtle-tag', { hasText: 'API Disconnected' });
    await expect(errorTag).toBeVisible({ timeout: 5000 });

    const retryBtn = page.getByRole('button', { name: 'Retry' });
    await expect(retryBtn).toBeVisible();

    // Capture error state screenshot
    await page.screenshot({
      path: path.join(evidenceDir, '03-scalar-field-error-state.png'),
      fullPage: true
    });

    // Now restore service and click Retry
    failRequest = false;
    await retryBtn.click();

    // Verify recovery to active thermal layer
    const activeTag = page.locator('.subtle-tag', { hasText: '3D Thermal Layer Active' });
    await expect(activeTag).toBeVisible({ timeout: 5000 });

    // Capture recovered screenshot
    await page.screenshot({
      path: path.join(evidenceDir, '04-scalar-field-recovered.png'),
      fullPage: true
    });
  });

});
