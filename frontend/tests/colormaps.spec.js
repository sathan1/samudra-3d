import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const evidenceDir = path.resolve('test-results', 'screenshots');
mkdirSync(evidenceDir, { recursive: true });

test.describe('Dynamic Thermal/Haline Color Mapping', () => {

  test('Switches between Thermal (Temperature) and Haline (Salinity) palettes', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto('/');

    // 1. Initial State: Temperature & cmocean thermal
    await expect(page.locator('.brand')).toContainText('SAMUDRA-3D');
    await expect(page.locator('.subtle-tag', { hasText: '3D Thermal Layer Active' })).toBeVisible({ timeout: 5000 });

    const legend = page.locator('[data-testid="color-bar-legend"]');
    await expect(legend).toBeVisible();
    await expect(legend).toContainText(/Potential Temperature/i);
    await expect(legend).toContainText('cmocean thermal');
    await expect(legend).toContainText('°C');

    const layerBadge = page.locator('.hud-badge', { hasText: 'LAYER:' });
    await expect(layerBadge).toContainText('Potential Temperature');

    await page.waitForTimeout(600);

    // Capture screenshot of Temperature with cmocean thermal palette
    await page.screenshot({
      path: path.join(evidenceDir, '01-thermal-temperature.png'),
      fullPage: true
    });

    // 2. Switch Variable to Salinity via Sidebar Controls
    const varSelect = page.locator('select#variable');
    await expect(varSelect).toBeEnabled();
    await varSelect.selectOption('salinity');

    // Wait for Salinity layer to fetch and render
    await expect(layerBadge).toContainText('Practical Salinity', { timeout: 5000 });
    await expect(layerBadge).toContainText('PSU');

    // Verify Legend updates to cmocean haline
    await expect(legend).toContainText(/Practical Salinity/i);
    await expect(legend).toContainText('cmocean haline');
    await expect(legend).toContainText('PSU');

    await page.waitForTimeout(600);

    // Capture screenshot of Salinity with cmocean haline palette
    await page.screenshot({
      path: path.join(evidenceDir, '02-haline-salinity.png'),
      fullPage: true
    });

    // 3. Toggle Scale Policy: Dynamic -> Fixed
    const scaleBtn = legend.getByRole('button', { name: /Scale:/ });
    await expect(scaleBtn).toContainText('Dynamic');
    await scaleBtn.click();
    await expect(scaleBtn).toContainText('Fixed');
    await expect(legend).toContainText('32.0 PSU');
    await expect(legend).toContainText('38.0 PSU');

    await page.waitForTimeout(400);

    // Capture screenshot of Fixed Scale disclosure
    await page.screenshot({
      path: path.join(evidenceDir, '03-haline-fixed-scale.png'),
      fullPage: true
    });
  });

  test('Rapid variable switching prevents race conditions and tears', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto('/');

    const varSelect = page.locator('select#variable');
    await expect(varSelect).toBeEnabled();

    // Rapidly alternate selections: temperature -> salinity -> temperature
    await varSelect.selectOption('salinity');
    await page.waitForTimeout(50);
    await varSelect.selectOption('temperature');
    await page.waitForTimeout(50);
    await varSelect.selectOption('salinity');

    // Wait for settled salinity state
    const layerBadge = page.locator('.hud-badge', { hasText: 'LAYER:' });
    await expect(layerBadge).toContainText('Practical Salinity', { timeout: 5000 });

    const legend = page.locator('[data-testid="color-bar-legend"]');
    await expect(legend).toContainText('cmocean haline');

    // Canvas must remain active without errors
    const canvas = page.locator('.globe-canvas-wrapper canvas');
    await expect(canvas).toBeVisible();
  });

});
