import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const evidenceDir = path.resolve('test-results', 'screenshots');
mkdirSync(evidenceDir, { recursive: true });

test.describe('Vertical Depth Profile Modal Curves & T-S Correlation Diagrams', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Indian Ocean workspace' })).toBeVisible();
    await page.locator('.subtle-tag', { hasText: '3D Thermal Layer Active' }).waitFor({ timeout: 10000 });
  });

  test('1. Inverted positive-down depth axis and Temperature profile curve', async ({ page }) => {
    // Enable Argo layer
    await page.locator('input#layer-argo').check();
    await expect(page.locator('[data-testid="hud-argo-badge"]')).toBeVisible();

    // Select float 2902145 (Bay of Bengal)
    const floatSelect = page.locator('select#argo-float-select');
    await floatSelect.selectOption('ARGO_2902145');

    // Profile modal container should be visible
    const modal = page.locator('[data-testid="profile-modal-container"]');
    await expect(modal).toBeVisible();
    await expect(page.locator('[data-testid="profile-title"]')).toContainText('2902145');

    // Default tab is Temperature
    const tempTab = page.locator('[data-testid="tab-temperature"]');
    await expect(tempTab).toHaveAttribute('aria-selected', 'true');

    // Verify SVG profile chart presence
    const svgChart = page.locator('[data-testid="vertical-depth-svg"]');
    await expect(svgChart).toBeVisible();

    // Check inverted depth axis label: Depth (m) ↓
    const yAxisLabel = page.locator('[data-testid="y-axis-label"]');
    await expect(yAxisLabel).toHaveText('Depth (m) ↓');

    // Check temperature X-axis label
    const xAxisLabel = page.locator('[data-testid="x-axis-label"]');
    await expect(xAxisLabel).toHaveText(/Temperature \(°C\) →/);

    // Verify curve path segments rendered
    const curvePaths = page.locator('[data-testid="profile-curve-path"]');
    await expect(curvePaths).toBeVisible();

    // Verify profile observation points rendered
    const profilePoints = page.locator('[data-testid="profile-point"]');
    const pointCount = await profilePoints.count();
    expect(pointCount).toBeGreaterThanOrEqual(10);

    // Hover over the first profile point (surface) and check crosshairs & tooltip
    await profilePoints.first().hover({ force: true });
    const tooltip = page.locator('[data-testid="chart-tooltip"]');
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText('Depth:');
    await expect(tooltip).toContainText('°C');
    await expect(tooltip).toContainText('QC: Good (Flag 1)');

    // Capture Screenshot 1: Temperature-Depth Profile
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(evidenceDir, '01-temperature-depth-profile.png') });
  });

  test('2. Salinity profile curve with inverted depth axis', async ({ page }) => {
    await page.locator('input#layer-argo').check();
    await page.locator('select#argo-float-select').selectOption('ARGO_2902145');

    // Switch to Salinity Tab
    const salTab = page.locator('[data-testid="tab-salinity"]');
    await salTab.click();
    await expect(salTab).toHaveAttribute('aria-selected', 'true');

    // Verify SVG axis labels for Salinity
    const yAxisLabel = page.locator('[data-testid="y-axis-label"]');
    await expect(yAxisLabel).toHaveText('Depth (m) ↓');

    const xAxisLabel = page.locator('[data-testid="x-axis-label"]');
    await expect(xAxisLabel).toHaveText(/Salinity \(PSU\) →/);

    // Hover a point in Salinity chart
    const profilePoints = page.locator('[data-testid="profile-point"]');
    await profilePoints.first().hover({ force: true });
    const tooltip = page.locator('[data-testid="chart-tooltip"]');
    await expect(tooltip).toContainText('PSU');

    // Capture Screenshot 2: Salinity-Depth Profile
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(evidenceDir, '02-salinity-depth-profile.png') });
  });

  test('3. T-S Diagram with UNESCO EOS-80 isopycnal contours and hover readout', async ({ page }) => {
    await page.locator('input#layer-argo').check();
    await page.locator('select#argo-float-select').selectOption('ARGO_2902145');

    // Switch to T-S Tab
    const tsTab = page.locator('[data-testid="tab-ts"]');
    await tsTab.click();
    await expect(tsTab).toHaveAttribute('aria-selected', 'true');

    // Verify T-S SVG chart
    const tsSvg = page.locator('[data-testid="ts-diagram-svg"]');
    await expect(tsSvg).toBeVisible();

    // Verify isopycnal contour paths (UNESCO EOS-80)
    const isopycnals = page.locator('[data-testid="isopycnal-path"]');
    const isopycnalCount = await isopycnals.count();
    expect(isopycnalCount).toBeGreaterThanOrEqual(5);

    // Verify isopycnal contour labels (e.g. σθ = 24.0 kg/m³)
    const isopycnalLabels = page.locator('[data-testid="isopycnal-label"]');
    expect(await isopycnalLabels.count()).toBeGreaterThanOrEqual(4);

    // Hover over a point in T-S diagram
    const tsPoints = page.locator('[data-testid="ts-data-point"]');
    await tsPoints.first().hover({ force: true });
    const tooltip = page.locator('[data-testid="chart-tooltip"]');
    await expect(tooltip).toContainText('σθ=');
    await expect(tooltip).toContainText('kg/m³');

    // Capture Screenshot 3: T-S Diagram with Isopycnals
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(evidenceDir, '03-ts-diagram-isopycnals.png') });
  });

  test('4. QC flag outlier gap rendering and Model Collocation Contract', async ({ page }) => {
    await page.locator('input#layer-argo').check();

    // Select Outlier Float: ARGO_TEST_QC_OUTLIER
    const floatSelect = page.locator('select#argo-float-select');
    await floatSelect.selectOption('ARGO_TEST_QC_OUTLIER');

    const modal = page.locator('[data-testid="profile-modal-container"]');
    await expect(modal).toBeVisible();

    // Verify QC badge shows <100% pass
    const qcBadge = page.locator('[data-testid="qc-badge"]');
    await expect(qcBadge).toContainText('Pass');

    // Check for bad QC outlier marker in chart
    const badPoint = page.locator('[data-testid="qc-outlier-point"]');
    await expect(badPoint).toBeVisible();

    // Verify QC Gap banner is displayed
    await expect(page.locator('text=⚠ QC Flag Discontinuity (Gap Rendered)')).toBeVisible();

    // Check Model comparison contract section
    const modelSection = page.locator('[data-testid="model-contract-section"]');
    await expect(modelSection).toBeVisible();
    await expect(page.locator('[data-testid="collocation-contract-tag"]')).toHaveText('Model Collocation Contract');

    // Checkbox is enabled for Collocation overlay
    const overlayCheckbox = modelSection.locator('input[type="checkbox"]');
    await expect(overlayCheckbox).toBeEnabled();

    // Capture Screenshot 4: QC Outlier Gap Handling & Collocation Contract
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(evidenceDir, '04-qc-outlier-gap-handling.png') });

    // Test accessible Escape key closing
    await page.keyboard.press('Escape');
    await expect(modal).toHaveCount(0);
    await expect(page.locator('[data-testid="profile-placeholder"]')).toBeVisible();
  });
});
