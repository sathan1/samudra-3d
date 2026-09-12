import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const evidenceDir = path.resolve('..', 'docs', 'evidence', 'phase-13');
mkdirSync(evidenceDir, { recursive: true });

test.describe('Phase 13: In-situ Observation vs Model Collocation & Bias Analytics', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Indian Ocean workspace' })).toBeVisible();
    await page.locator('.subtle-tag', { hasText: '3D Thermal Layer Active' }).waitFor({ timeout: 10000 });
  });

  test('1. Model overlay checkbox toggle and co-located curve rendering', async ({ page }) => {
    // Enable Argo layer
    await page.locator('input#layer-argo').check();
    await expect(page.locator('[data-testid="hud-argo-badge"]')).toBeVisible();

    // Select float ARGO_2902145
    const floatSelect = page.locator('select#argo-float-select');
    await floatSelect.selectOption('ARGO_2902145');

    const modal = page.locator('[data-testid="profile-modal-container"]');
    await expect(modal).toBeVisible();

    // Model overlay checkbox should be enabled
    const overlayToggle = page.locator('[data-testid="model-overlay-toggle"]');
    await expect(overlayToggle).toBeVisible();
    await expect(overlayToggle).toBeEnabled();
    await expect(overlayToggle).not.toBeChecked();

    // Model curve should initially not be in the SVG
    await expect(page.locator('[data-testid="model-curve-path"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="collocation-metrics-badge"]')).toHaveCount(0);

    // Toggle model overlay on
    await overlayToggle.check();
    await expect(overlayToggle).toBeChecked();

    // Overlaid dashed model curve must now be rendered
    const modelCurve = page.locator('[data-testid="model-curve-path"]');
    await expect(modelCurve).toBeVisible();
    await expect(modelCurve).toHaveAttribute('stroke-dasharray', '4,4');

    // Model points should be rendered
    const modelPoints = page.locator('[data-testid="model-point"]');
    expect(await modelPoints.count()).toBeGreaterThanOrEqual(10);

    // Metrics badge must display Bias, MAE, and RMSE
    const metricsBadge = page.locator('[data-testid="collocation-metrics-badge"]');
    await expect(metricsBadge).toBeVisible();
    await expect(metricsBadge).toContainText('Bias:');
    await expect(metricsBadge).toContainText('MAE:');
    await expect(metricsBadge).toContainText('RMSE:');

    // Capture Screenshot 1: Model Overlay Temperature Profile
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(evidenceDir, '01-model-overlay-temperature-profile.png') });
  });

  test('2. Salinity model overlay curve and metrics', async ({ page }) => {
    await page.locator('input#layer-argo').check();
    await page.locator('select#argo-float-select').selectOption('ARGO_2902145');

    // Turn on model overlay
    await page.locator('[data-testid="model-overlay-toggle"]').check();
    await expect(page.locator('[data-testid="model-curve-path"]')).toBeVisible();

    // Switch to Salinity tab
    await page.locator('[data-testid="tab-salinity"]').click();
    await expect(page.locator('[data-testid="x-axis-label"]')).toHaveText(/Salinity \(PSU\) →/);

    // Model curve must be rendered for Salinity
    const modelCurve = page.locator('[data-testid="model-curve-path"]');
    await expect(modelCurve).toBeVisible();

    // Metrics badge must show PSU units
    const metricsBadge = page.locator('[data-testid="collocation-metrics-badge"]');
    await expect(metricsBadge).toBeVisible();
    await expect(metricsBadge).toContainText('PSU');

    // Capture Screenshot 2: Model Overlay Salinity Profile
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(evidenceDir, '02-model-overlay-salinity-profile.png') });
  });

  test('3. Interactive crosshairs with dual observation and model values and live delta', async ({ page }) => {
    await page.locator('input#layer-argo').check();
    await page.locator('select#argo-float-select').selectOption('ARGO_2902145');
    await page.locator('[data-testid="model-overlay-toggle"]').check();

    // Hover over the first observation point
    const firstPoint = page.locator('[data-testid="profile-point"]').first();
    await firstPoint.hover({ force: true });

    // Tooltip should contain Obs, Model, and Delta
    const tooltip = page.locator('[data-testid="chart-tooltip"]');
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText('Obs:');
    await expect(tooltip).toContainText('Model:');
    await expect(tooltip).toContainText('Δ:');

    // Capture Screenshot 3: Dual-Curve Crosshair Delta Inspection
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(evidenceDir, '03-dual-curve-crosshair-delta-inspection.png') });
  });

  test('4. ComparisonPanel difference and model health assessment', async ({ page }) => {
    await page.locator('input#layer-argo').check();
    await page.locator('select#argo-float-select').selectOption('ARGO_2902145');

    // ComparisonPanel section
    const compSection = page.locator('[data-testid="model-comparison-summary"]');
    await expect(compSection).toBeVisible();

    // Tag should indicate 4D Collocation Active
    await expect(compSection.locator('.subtle-tag')).toHaveText('4D Collocation Active');

    // Difference metric should show computed Bias
    const diffVal = page.locator('[data-testid="comparison-difference"]');
    await expect(diffVal).toBeVisible();
    await expect(diffVal).toContainText('°C');

    // Model health should show assessment badge
    const healthVal = page.locator('[data-testid="comparison-health"]');
    await expect(healthVal).toBeVisible();
    await expect(healthVal).toContainText('RMSE');

    // Capture Screenshot 4: Bias Metrics and Model Health Assessment
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(evidenceDir, '04-bias-metrics-model-health-assessment.png') });

    // Test toggle off cleanly hides model curve
    await page.locator('[data-testid="model-overlay-toggle"]').uncheck();
    await expect(page.locator('[data-testid="model-curve-path"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="collocation-metrics-badge"]')).toHaveCount(0);
  });
});
