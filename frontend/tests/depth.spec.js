import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const evidenceDir = path.resolve('test-results', 'screenshots');
mkdirSync(evidenceDir, { recursive: true });

test.describe('Interactive Depth Slicer (0m to 4,000m)', () => {

  test('Depth slider navigates surface, thermocline, and abyss with snapping disclosure', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto('/');

    // 1. Initial State: Surface 0m
    await expect(page.locator('.brand')).toContainText('SAMUDRA-3D');
    const depthSlider = page.locator('input#depth');
    await expect(depthSlider).toBeEnabled();
    await expect(depthSlider).toHaveValue('0');

    const depthDisplay = page.locator('[data-testid="depth-value-display"]');
    await expect(depthDisplay).toContainText('Surface (0 m)');

    const layerBadge = page.locator('.hud-badge', { hasText: 'LAYER:' });
    await expect(layerBadge).toContainText('0m Surface');
    await expect(layerBadge).toContainText('28.5');

    const depthBadge = page.locator('[data-testid="hud-depth-badge"]');
    await expect(depthBadge).toContainText('0m requested');
    await expect(depthBadge).toContainText('Surface level');

    await page.waitForTimeout(600);

    // Screenshot 01: Surface (0m)
    await page.screenshot({
      path: path.join(evidenceDir, '01-surface-0m.png'),
      fullPage: true
    });

    // 2. Slicing to Thermocline: 100m
    await depthSlider.fill('100');
    await depthSlider.dispatchEvent('change');

    await expect(depthDisplay).toContainText('100 m');
    await expect(layerBadge).toContainText('100m Subsurface', { timeout: 5000 });
    await expect(layerBadge).toContainText('21.4');
    await expect(depthBadge).toContainText('100m requested');

    await page.waitForTimeout(600);

    // Screenshot 02: Thermocline (100m)
    await page.screenshot({
      path: path.join(evidenceDir, '02-thermocline-100m.png'),
      fullPage: true
    });

    // 3. Slicing to Abyssal Floor: 4000m
    await depthSlider.fill('4000');
    await depthSlider.dispatchEvent('change');

    await expect(depthDisplay).toContainText('4000 m');
    await expect(layerBadge).toContainText('4000m Subsurface', { timeout: 5000 });
    await expect(layerBadge).toContainText('2.0');
    await expect(depthBadge).toContainText('4000m requested');

    await page.waitForTimeout(600);

    // Screenshot 03: Abyssal Floor (4000m)
    await page.screenshot({
      path: path.join(evidenceDir, '03-abyssal-4000m.png'),
      fullPage: true
    });

    // 4. Non-Grid Depth Selection: 75m (snaps to 50m model layer)
    await depthSlider.fill('75');
    await depthSlider.dispatchEvent('change');

    await expect(depthDisplay).toContainText('75 m');
    await expect(layerBadge).toContainText('50m Subsurface', { timeout: 5000 });
    await expect(depthBadge).toContainText('75m requested');
    await expect(depthBadge).toContainText('snapped to 50m model level');

    // Verify sidebar helper discloses snapping
    const depthHelper = page.locator('#depth-help');
    await expect(depthHelper).toContainText('Requested 75 m (snapped to 50 m model level)');

    await page.waitForTimeout(600);

    // Screenshot 04: Non-grid snapping disclosure (75m -> 50m)
    await page.screenshot({
      path: path.join(evidenceDir, '04-non-grid-snapping-75m.png'),
      fullPage: true
    });
  });

  test('Rapid depth dragging and out-of-order rejection settles on final selection', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto('/');

    const depthSlider = page.locator('input#depth');
    await expect(depthSlider).toBeEnabled();

    // Rapidly change depths
    await depthSlider.fill('1000');
    await depthSlider.dispatchEvent('change');
    await page.waitForTimeout(40);

    await depthSlider.fill('200');
    await depthSlider.dispatchEvent('change');
    await page.waitForTimeout(40);

    await depthSlider.fill('500');
    await depthSlider.dispatchEvent('change');

    // Wait for final state (500m) to settle
    const depthBadge = page.locator('[data-testid="hud-depth-badge"]');
    await expect(depthBadge).toContainText('500m requested', { timeout: 5000 });

    const layerBadge = page.locator('.hud-badge', { hasText: 'LAYER:' });
    await expect(layerBadge).toContainText('500m Subsurface');

    // Canvas must remain active without errors
    const canvas = page.locator('.globe-canvas-wrapper canvas');
    await expect(canvas).toBeVisible();
  });

  test('Variable switching preserves depth level and vice-versa', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto('/');

    const depthSlider = page.locator('input#depth');
    await depthSlider.fill('100');
    await depthSlider.dispatchEvent('change');

    const layerBadge = page.locator('.hud-badge', { hasText: 'LAYER:' });
    await expect(layerBadge).toContainText('100m Subsurface', { timeout: 5000 });

    // Switch variable to Salinity
    const varSelect = page.locator('select#variable');
    await varSelect.selectOption('salinity');

    // Verify Salinity is active AND at 100m subsurface
    await expect(layerBadge).toContainText('Practical Salinity', { timeout: 5000 });
    await expect(layerBadge).toContainText('100m Subsurface');
    await expect(layerBadge).toContainText('PSU');

    const depthBadge = page.locator('[data-testid="hud-depth-badge"]');
    await expect(depthBadge).toContainText('100m requested');
  });

  test('Keyboard accessible slider navigation', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto('/');

    const depthSlider = page.locator('input#depth');
    await depthSlider.focus();
    await expect(depthSlider).toBeFocused();

    // ArrowRight steps by step=5
    await page.keyboard.press('ArrowRight');
    const depthDisplay = page.locator('[data-testid="depth-value-display"]');
    await expect(depthDisplay).toContainText('5 m');

    await page.keyboard.press('ArrowRight');
    await expect(depthDisplay).toContainText('10 m');

    await page.keyboard.press('ArrowLeft');
    await expect(depthDisplay).toContainText('5 m');
  });

});
