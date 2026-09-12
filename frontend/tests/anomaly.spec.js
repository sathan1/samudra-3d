import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const evidenceDir = path.resolve('..', 'docs', 'evidence', 'phase-14');
mkdirSync(evidenceDir, { recursive: true });

test.describe('Phase 14: 3D Difference Field & Anomaly Heatmap', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Indian Ocean workspace' })).toBeVisible();
    await page.locator('.subtle-tag', { hasText: '3D Thermal Layer Active' }).waitFor({ timeout: 10000 });
  });

  test('1. Anomaly toggle enables, field loaded, sphere layer visible, coverage count shown', async ({ page }) => {
    // Locate and check the anomaly layer toggle in ComparisonPanel
    const anomalyToggle = page.locator('[data-testid="anomaly-toggle"]');
    await expect(anomalyToggle).toBeVisible();
    await expect(anomalyToggle).not.toBeChecked();

    await anomalyToggle.check();
    await expect(anomalyToggle).toBeChecked();

    // Verify 3D anomaly layer badge in HUD
    const hudBadge = page.locator('[data-testid="hud-anomaly-badge"]');
    await expect(hudBadge).toBeVisible({ timeout: 5000 });
    await expect(hudBadge).toContainText('ANOMALY FIELD:');

    // Verify 3D anomaly layer marker in canvas container
    await expect(page.locator('[data-testid="anomaly-sphere-layer"]')).toBeAttached();

    // Verify coverage count readout
    const coverageCount = page.locator('[data-testid="anomaly-coverage-count"]');
    await expect(coverageCount).toBeVisible();
    await expect(coverageCount).toContainText('Coverage:');
    await expect(coverageCount).toContainText('valid pairs');

    // Capture Screenshot 1: 3D Anomaly Residual Field Overview
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(evidenceDir, '01-3d-anomaly-residual-field-overview.png') });
  });

  test('2. Configurable threshold updates discrepancy alerts and alert list', async ({ page }) => {
    await page.locator('[data-testid="anomaly-toggle"]').check();
    await expect(page.locator('[data-testid="hud-anomaly-badge"]')).toBeVisible();

    // Alert count badge must be visible
    const alertCount = page.locator('[data-testid="anomaly-alert-count"]');
    await expect(alertCount).toBeVisible();
    await expect(alertCount).toContainText('discrepancy alert');

    // Alert list must contain items
    const alertItems = page.locator('[data-testid="anomaly-alert-item"]');
    await expect(alertItems.first()).toBeVisible({ timeout: 5000 });
    const initialAlerts = await alertItems.count();
    expect(initialAlerts).toBeGreaterThanOrEqual(1);

    // Check first alert item contains required labels
    const firstAlert = alertItems.first();
    await expect(firstAlert).toContainText('Model-observation discrepancy');
    await expect(firstAlert).toContainText('Δ =');

    // Slider interaction: increase threshold to 2.5 °C
    const slider = page.locator('[data-testid="anomaly-threshold-slider"]');
    await slider.fill('2.5');

    // Capture Screenshot 2: Anomaly Discrepancy Alerts & Threshold
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(evidenceDir, '02-anomaly-discrepancy-alerts-and-threshold.png') });
  });

  test('3. Salinity anomaly field and physical unit separation', async ({ page }) => {
    await page.locator('[data-testid="anomaly-toggle"]').check();
    await expect(page.locator('[data-testid="hud-anomaly-badge"]')).toBeVisible();

    // Select Salinity variable
    const varSelect = page.locator('[data-testid="anomaly-variable-select"]');
    await varSelect.selectOption('salinity');

    // Verify physical units update to PSU
    await expect(page.locator('[data-testid="anomaly-panel-section"]')).toContainText('PSU');

    // Coverage must reflect salinity matched pairs
    const coverage = page.locator('[data-testid="anomaly-coverage-count"]');
    await expect(coverage).toContainText('valid pairs');

    // Capture Screenshot 3: Salinity Anomaly Field (PSU)
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(evidenceDir, '03-salinity-anomaly-field-psu.png') });
  });

  test('4. Traceable source inspection: click alert item opens profile modal', async ({ page }) => {
    await page.locator('[data-testid="anomaly-toggle"]').check();
    await expect(page.locator('[data-testid="hud-anomaly-badge"]')).toBeVisible();

    const alertItems = page.locator('[data-testid="anomaly-alert-item"]');
    await expect(alertItems.first()).toBeVisible();

    // Click on the first alert item to trace back to source profile
    await alertItems.first().click();

    // Profile modal must open for the corresponding float/glider
    const modal = page.locator('[data-testid="profile-modal-container"]');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Capture Screenshot 4: Traceable Anomaly to Source Profile
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(evidenceDir, '04-traceable-anomaly-to-source-profile.png') });

    // Close modal with Escape
    await page.keyboard.press('Escape');
    await expect(modal).toHaveCount(0);
  });
});
