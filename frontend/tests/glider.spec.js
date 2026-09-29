import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const evidenceDir = path.resolve('test-results', 'screenshots');
mkdirSync(evidenceDir, { recursive: true });

test.describe('Underwater Glider Sawtooth Transects', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Indian Ocean workspace' })).toBeVisible();
    await page.locator('.subtle-tag', { hasText: '3D Thermal Layer Active' }).waitFor({ timeout: 10000 });
  });

  test('1. Glider layer toggle, active count, and HUD badge', async ({ page }) => {
    const gliderCheckbox = page.locator('input#layer-glider');
    const gliderState = page.locator('[data-testid="glider-layer-state"]');
    const hudBadge = page.locator('[data-testid="hud-glider-badge"]');

    // Initially unchecked
    await expect(gliderCheckbox).not.toBeChecked();
    await expect(gliderState).toHaveText('Off');
    await expect(hudBadge).toHaveCount(0);

    // Toggle Gliders layer on
    await gliderCheckbox.check();
    await expect(gliderCheckbox).toBeChecked();
    await expect(gliderState).toHaveText(/Active \(2 missions\)/);
    await expect(hudBadge).toBeVisible();
    await expect(hudBadge).toContainText('GLIDERS: 2 active (INCOIS-Seaglider)');

    // Accessible keyboard dropdown should appear
    const gliderSelect = page.locator('select#glider-transect-select');
    await expect(gliderSelect).toBeVisible();
    await expect(gliderSelect.locator('option')).toHaveCount(3); // default + 2 missions

    // Capture Screenshot 1: Glider Transect Overview
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(evidenceDir, '01-glider-transect-overview.png') });

    // Toggle layer off
    await gliderCheckbox.uncheck();
    await expect(gliderCheckbox).not.toBeChecked();
    await expect(gliderState).toHaveText('Off');
    await expect(hudBadge).toHaveCount(0);
    await expect(gliderSelect).toHaveCount(0);
  });

  test('2. Glider mission selection and ProfileModal vertical curve inspection', async ({ page }) => {
    // Enable Gliders layer
    await page.locator('input#layer-glider').check();
    await expect(page.locator('[data-testid="hud-glider-badge"]')).toBeVisible();

    // Select Bay of Bengal Seaglider (GLIDER_BOB_SG01)
    const gliderSelect = page.locator('select#glider-transect-select');
    await gliderSelect.selectOption('GLIDER_BOB_SG01');

    // Profile modal container should be visible
    const modal = page.locator('[data-testid="profile-modal-container"]');
    await expect(modal).toBeVisible();

    // Verify platform tag is GLIDER TRANSECT
    await expect(modal.locator('.subtle-tag', { hasText: 'GLIDER TRANSECT' })).toBeVisible();
    await expect(page.locator('[data-testid="profile-title"]')).toContainText('INCOIS Seaglider SG01');
    await expect(page.locator('[data-testid="wmo-number-val"]')).toHaveText('GL_2902001');

    // Verify vertical depth SVG chart with inverted depth axis
    const svgChart = page.locator('[data-testid="vertical-depth-svg"]');
    await expect(svgChart).toBeVisible();
    await expect(page.locator('[data-testid="y-axis-label"]')).toHaveText('Depth (m) ↓');
    await expect(page.locator('[data-testid="x-axis-label"]')).toHaveText(/Temperature \(°C\) →/);

    // Switch to Salinity tab
    await page.locator('[data-testid="tab-salinity"]').click();
    await expect(page.locator('[data-testid="x-axis-label"]')).toHaveText(/Salinity \(PSU\) →/);

    // Switch to T-S diagram tab
    await page.locator('[data-testid="tab-ts"]').click();
    const tsSvg = page.locator('[data-testid="ts-diagram-svg"]');
    await expect(tsSvg).toBeVisible();
    const isopycnals = page.locator('[data-testid="isopycnal-path"]');
    expect(await isopycnals.count()).toBeGreaterThanOrEqual(5);

    // Capture Screenshot 3: Glider Profile Inspector
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(evidenceDir, '03-glider-profile-inspector.png') });

    // Deselect via close button
    await page.locator('[data-testid="deselect-float-btn"]').click();
    await expect(modal).toHaveCount(0);
    await expect(page.locator('[data-testid="profile-placeholder"]')).toBeVisible();
  });

  test('3. Glider gap and outlier fixture verification', async ({ page }) => {
    await page.locator('input#layer-glider').check();

    // Select gap fixture
    const gliderSelect = page.locator('select#glider-transect-select');
    await gliderSelect.selectOption('GLIDER_TEST_GAP_FIXTURE');

    const modal = page.locator('[data-testid="profile-modal-container"]');
    await expect(modal).toBeVisible();
    await expect(page.locator('[data-testid="profile-title"]')).toContainText('Glider Gap & Outlier Test Fixture');

    // Check QC alert point and gap banner
    await expect(page.locator('[data-testid="qc-outlier-point"]')).toBeVisible();
    await expect(page.locator('text=⚠ QC Flag Discontinuity (Gap Rendered)')).toBeVisible();

    // Capture Screenshot 2: Sawtooth Dives & Gap Detail
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(evidenceDir, '02-sawtooth-dives-3d-detail.png') });
  });

  test('4. Multi-sensor concurrency (Argo + Gliders + Currents) and render performance (>60 FPS)', async ({ page }) => {
    // Enable Argo layer
    await page.locator('input#layer-argo').check();
    await expect(page.locator('[data-testid="hud-argo-badge"]')).toBeVisible();

    // Enable Glider layer
    await page.locator('input#layer-glider').check();
    await expect(page.locator('[data-testid="hud-glider-badge"]')).toBeVisible();

    // Enable Current streamlines
    await page.locator('input#layer-currents').check();
    await expect(page.locator('[data-testid="hud-streamlines-badge"]')).toBeVisible();

    // All three HUD badges must coexist simultaneously
    await expect(page.locator('[data-testid="hud-argo-badge"]')).toContainText('ARGO FLOATS: 3 active');
    await expect(page.locator('[data-testid="hud-glider-badge"]')).toContainText('GLIDERS: 2 active');
    await expect(page.locator('[data-testid="hud-streamlines-badge"]')).toContainText('1,500 particles active');

    // Capture Screenshot 4: Multi-sensor Concurrency
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(evidenceDir, '04-multi-sensor-argo-glider-currents.png') });

    // Measure FPS performance under full multi-sensor load over 1 second
    const fpsMetrics = await page.evaluate(async () => {
      return new Promise((resolve) => {
        let count = 0;
        const start = window.performance.now();
        function frame() {
          count++;
          if (window.performance.now() - start < 1000) {
            window.requestAnimationFrame(frame);
          } else {
            const elapsed = window.performance.now() - start;
            resolve({
              fps: Math.round((count * 1000) / elapsed),
              frameCount: count,
              elapsedMs: elapsed
            });
          }
        }
        window.requestAnimationFrame(frame);
      });
    });

    console.log(`Measured Multi-Sensor WebGL Performance: ${fpsMetrics.fps} FPS (${fpsMetrics.frameCount} frames in ${fpsMetrics.elapsedMs.toFixed(1)}ms)`);
    expect(fpsMetrics.fps).toBeGreaterThanOrEqual(60);
  });
});
