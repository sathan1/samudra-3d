import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const evidenceDir = path.resolve('..', 'docs', 'evidence', 'phase-10');
mkdirSync(evidenceDir, { recursive: true });

test.describe('Phase 10: Clickable 3D Argo Float Markers', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Indian Ocean workspace' })).toBeVisible();
    await page.locator('.subtle-tag', { hasText: '3D Thermal Layer Active' }).waitFor({ timeout: 10000 });
  });

  test('1. Argo float layer toggle, active state, and HUD badge', async ({ page }) => {
    const argoCheckbox = page.locator('input#layer-argo');
    const argoState = page.locator('[data-testid="argo-layer-state"]');
    const hudBadge = page.locator('[data-testid="hud-argo-badge"]');

    // Initially unchecked
    await expect(argoCheckbox).not.toBeChecked();
    await expect(argoState).toHaveText('Off');
    await expect(hudBadge).toHaveCount(0);

    // Toggle layer on
    await argoCheckbox.check();
    await expect(argoCheckbox).toBeChecked();
    await expect(argoState).toHaveText(/Active \(3 floats\)/);
    await expect(hudBadge).toBeVisible();
    await expect(hudBadge).toContainText('ARGO FLOATS: 3 active (INCOIS-DAC)');

    // Accessible keyboard dropdown should appear
    const floatSelect = page.locator('select#argo-float-select');
    await expect(floatSelect).toBeVisible();
    await expect(floatSelect.locator('option')).toHaveCount(4); // default empty + 3 floats

    // Capture Screenshot 1: Overview
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(evidenceDir, '01-argo-markers-overview.png') });

    // Toggle layer off
    await argoCheckbox.uncheck();
    await expect(argoCheckbox).not.toBeChecked();
    await expect(argoState).toHaveText('Off');
    await expect(hudBadge).toHaveCount(0);
    await expect(floatSelect).toHaveCount(0);

    // Capture Screenshot 4: Toggled off
    await page.screenshot({ path: path.join(evidenceDir, '04-argo-layer-toggled-off.png') });
  });

  test('2. Float selection, typed metadata display in ProfileModal, and deselect lifecycle', async ({ page }) => {
    // Enable layer
    await page.locator('input#layer-argo').check();
    await expect(page.locator('[data-testid="hud-argo-badge"]')).toBeVisible();

    // Verify initial placeholder state
    await expect(page.locator('[data-testid="profile-placeholder"]')).toBeVisible();
    await expect(page.locator('#profile-heading')).toHaveText('No sensor selected');

    // Select Bay of Bengal float (ARGO_2902145) via accessible selector
    const floatSelect = page.locator('select#argo-float-select');
    await floatSelect.selectOption('ARGO_2902145');

    // Profile details should now be visible
    const details = page.locator('[data-testid="profile-details"]');
    await expect(details).toBeVisible();
    await expect(page.locator('[data-testid="wmo-number-val"]')).toHaveText('2902145');
    await expect(page.locator('[data-testid="float-coords-val"]')).toHaveText('12.48°N, 82.03°E');
    await expect(page.locator('[data-testid="qc-badge"]')).toContainText('100% Pass');

    // Capture Screenshot 2: Modal with Bay of Bengal Float
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(evidenceDir, '02-float-selected-modal.png') });

    // Select Arabian Sea float (ARGO_2902198)
    await floatSelect.selectOption('ARGO_2902198');
    await expect(page.locator('[data-testid="wmo-number-val"]')).toHaveText('2902198');
    await expect(page.locator('[data-testid="float-coords-val"]')).toHaveText('16.52°N, 71.85°E');

    // Capture Screenshot 3: Keyboard selection with Arabian Sea Float
    await page.screenshot({ path: path.join(evidenceDir, '03-keyboard-selection.png') });

    // Deselect via close button
    await page.locator('[data-testid="close-profile-btn"], [data-testid="deselect-float-btn"]').click();
    await expect(page.locator('[data-testid="profile-placeholder"]')).toBeVisible();
    await expect(page.locator('#profile-heading')).toHaveText('No sensor selected');
  });

  test('3. Drag vs click discrimination and render performance (>60 FPS)', async ({ page }) => {
    await page.locator('input#layer-argo').check();
    await expect(page.locator('[data-testid="hud-argo-badge"]')).toBeVisible();

    const canvas = page.locator('[data-testid="three-canvas-container"]');
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();

    // Perform an intentional camera drag (>4px movement)
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 80, box.y + box.height / 2 + 50, { steps: 5 });
    await page.mouse.up();

    // Drag must NOT trigger accidental float selection
    await expect(page.locator('[data-testid="profile-placeholder"]')).toBeVisible();
    await expect(page.locator('#profile-heading')).toHaveText('No sensor selected');

    // Measure FPS over 1 second
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

    console.log(`Measured WebGL Render Performance: ${fpsMetrics.fps} FPS (${fpsMetrics.frameCount} frames in ${fpsMetrics.elapsedMs.toFixed(1)}ms)`);
    expect(fpsMetrics.fps).toBeGreaterThanOrEqual(60);
  });
});
