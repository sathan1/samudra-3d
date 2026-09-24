import { test, expect } from '@playwright/test';
import path from 'node:path';
import { mkdirSync } from 'node:fs';

const evidenceDir = path.resolve('test-results', 'screenshots');
mkdirSync(evidenceDir, { recursive: true });

test.describe('3D Current Vector Particle Streamlines', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Indian Ocean workspace' })).toBeVisible();
    await expect(page.locator('canvas')).toBeVisible();
    await page.locator('[data-testid="hud-time-badge"]').waitFor({ timeout: 15000 });
  });

  test('Toggle Current streamlines on, display HUD badge and render particles', async ({ page }) => {
    const currentsToggle = page.locator('[data-testid="current-streamlines-toggle"]');
    const layerState = page.locator('[data-testid="currents-layer-state"]');
    const hudStreamlinesBadge = page.locator('[data-testid="hud-streamlines-badge"]');

    // 1. Initial State: Streamlines off
    await expect(currentsToggle).not.toBeChecked();
    await expect(layerState).toHaveText('Off');
    await expect(hudStreamlinesBadge).toHaveCount(0);

    // 2. Toggle Streamlines ON
    await currentsToggle.check();
    await expect(currentsToggle).toBeChecked();
    await expect(layerState).toContainText('Active (1,500 particles)');

    // 3. HUD Streamlines badge appears
    await expect(hudStreamlinesBadge).toBeVisible({ timeout: 10000 });
    await expect(hudStreamlinesBadge).toContainText('STREAMLINES:');
    await expect(hudStreamlinesBadge).toContainText('1,500 particles active');

    // Wait a brief moment for particles to advect
    await page.waitForTimeout(500);

    // Screenshot 1: Surface Temperature + 1,500 Current Streamlines
    await page.screenshot({ path: path.join(evidenceDir, '01-surface-currents-overlay.png'), fullPage: true });
  });

  test('Depth slicing and variable switching preserves current streamlines', async ({ page }) => {
    const currentsToggle = page.locator('[data-testid="current-streamlines-toggle"]');
    const depthSlider = page.locator('input#depth');
    const variableSelect = page.locator('select#variable');
    const hudDepthBadge = page.locator('[data-testid="hud-depth-badge"]');
    const hudStreamlinesBadge = page.locator('[data-testid="hud-streamlines-badge"]');

    // Enable streamlines
    await currentsToggle.check();
    await expect(hudStreamlinesBadge).toBeVisible({ timeout: 10000 });

    // 1. Slice to 100m depth
    await depthSlider.fill('100');
    await depthSlider.dispatchEvent('change');
    await expect(hudDepthBadge).toContainText('100m', { timeout: 10000 });
    await expect(hudStreamlinesBadge).toBeVisible();

    await page.waitForTimeout(500);
    // Screenshot 2: Subsurface 100m depth with streamlines
    await page.screenshot({ path: path.join(evidenceDir, '02-subsurface-100m-currents.png'), fullPage: true });

    // 2. Switch variable to Practical Salinity (haline)
    await variableSelect.selectOption('salinity');
    await expect(page.locator('[data-testid="color-bar-legend"]')).toContainText(/Practical Salinity/i, { timeout: 10000 });
    await expect(hudStreamlinesBadge).toBeVisible();

    await page.waitForTimeout(500);
    // Screenshot 3: Currents with Practical Salinity
    await page.screenshot({ path: path.join(evidenceDir, '03-currents-with-salinity.png'), fullPage: true });
  });

  test('Toggle currents off and verify clean disposal and FPS performance', async ({ page }) => {
    const currentsToggle = page.locator('[data-testid="current-streamlines-toggle"]');
    const layerState = page.locator('[data-testid="currents-layer-state"]');
    const hudStreamlinesBadge = page.locator('[data-testid="hud-streamlines-badge"]');

    // Enable streamlines first
    await currentsToggle.check();
    await expect(hudStreamlinesBadge).toBeVisible({ timeout: 10000 });

    // Toggle off
    await currentsToggle.uncheck();
    await expect(currentsToggle).not.toBeChecked();
    await expect(layerState).toHaveText('Off');
    await expect(hudStreamlinesBadge).toHaveCount(0);

    // Screenshot 4: Currents toggled off
    await page.screenshot({ path: path.join(evidenceDir, '04-currents-toggled-off.png'), fullPage: true });

    // Repeated toggle stress test (5 cycles)
    for (let i = 0; i < 5; i++) {
      await currentsToggle.check();
      await currentsToggle.uncheck();
    }

    // Leave enabled for performance measurement
    await currentsToggle.check();
    await expect(hudStreamlinesBadge).toBeVisible({ timeout: 10000 });

    // Measure WebGL render loop performance for 1000ms
    const fpsResult = await page.evaluate(async () => {
      return new Promise((resolve) => {
        let frames = 0;
        const start = window.performance.now();
        function loop() {
          frames++;
          if (window.performance.now() - start >= 1000) {
            const duration = window.performance.now() - start;
            const fps = Math.round((frames * 1000) / duration);
            resolve({ frames, duration, fps });
          } else {
            window.requestAnimationFrame(loop);
          }
        }
        window.requestAnimationFrame(loop);
      });
    });

    console.log('Streamlines Render FPS:', fpsResult);
    expect(fpsResult.fps).toBeGreaterThan(60);
  });
});
