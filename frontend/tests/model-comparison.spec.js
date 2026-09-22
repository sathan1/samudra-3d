import { test, expect } from '@playwright/test';

test.describe('Model Prediction vs In-Situ Observation Comparison Suite', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to operational workspace
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('Indian Ocean workspace');
    // Ensure canvas and UI are initialized
    await expect(page.locator('canvas')).toBeVisible();
  });

  test('TC01: Launch comparison modal from Header and verify 4D collocation scorecard', async ({ page }) => {
    // Click header comparison button
    const headerBtn = page.locator('[data-testid="header-compare-btn"]');
    await expect(headerBtn).toBeVisible();
    await headerBtn.click();

    // Verify modal is open
    const modal = page.locator('[data-testid="model-comparison-modal"]');
    await expect(modal).toBeVisible();

    // Verify scorecard metrics are rendered with valid scientific values
    const mbe = page.locator('[data-testid="metric-bias-val"]');
    await expect(mbe).toBeVisible();
    const mbeText = await mbe.innerText();
    expect(mbeText).toMatch(/[+-]?\d+(\.\d+)?\s*°C/);

    const rmse = page.locator('[data-testid="metric-rmse-val"]');
    await expect(rmse).toBeVisible();
    const rmseText = await rmse.innerText();
    expect(rmseText).toMatch(/\d+(\.\d+)?\s*°C/);

    const mae = page.locator('[data-testid="metric-mae-val"]');
    await expect(mae).toBeVisible();
    const maeText = await mae.innerText();
    expect(maeText).toMatch(/\d+(\.\d+)?\s*°C/);

    const pearson = page.locator('[data-testid="metric-pearson-val"]');
    await expect(pearson).toBeVisible();
    const pearsonText = await pearson.innerText();
    expect(pearsonText).toMatch(/\+?0\.\d+/);

    const health = page.locator('[data-testid="metric-health-val"]');
    await expect(health).toBeVisible();
    const healthText = await health.innerText();
    expect(['EXCELLENT', 'GOOD', 'ACCEPTABLE', 'REQUIRES_CALIBRATION']).toContain(healthText.trim());

    // Verify Dual-Curves SVG renderer
    const dualSvg = page.locator('[data-testid="dual-curves-svg"]');
    await expect(dualSvg).toBeVisible();

    // Verify observed curve and predicted curve
    await expect(page.locator('[data-testid="observed-curve-path"]')).toBeVisible();
    await expect(page.locator('[data-testid="predicted-curve-path"]')).toBeVisible();

    // Verify observed and predicted level nodes
    const obsPoints = page.locator('[data-testid="observed-point-node"]');
    expect(await obsPoints.count()).toBeGreaterThanOrEqual(5);

    const predPoints = page.locator('[data-testid="predicted-point-node"]');
    expect(await predPoints.count()).toBeGreaterThanOrEqual(5);

    // Close modal
    await page.locator('[data-testid="close-comparison-modal-btn"]').click();
    await expect(modal).not.toBeVisible();
  });

  test('TC02: Run Model Prediction Job with custom temporal strategy and inspect latency', async ({ page }) => {
    // Open modal
    await page.locator('[data-testid="header-compare-btn"]').click();
    const modal = page.locator('[data-testid="model-comparison-modal"]');
    await expect(modal).toBeVisible();

    // Change temporal strategy to nearest
    const strategySelect = page.locator('[data-testid="time-strategy-select"]');
    await strategySelect.selectOption('nearest');

    // Trigger Run Model Prediction Job
    const runBtn = page.locator('[data-testid="run-prediction-job-btn"]');
    await expect(runBtn).toBeVisible();
    await runBtn.click();

    // Wait for job execution completion
    await expect(modal).toContainText('Prediction job completed in');

    // Switch parameter to Salinity
    const salBtn = page.locator('[data-testid="compare-param-sal-btn"]');
    await salBtn.click();

    // Verify unit updated to PSU
    const mbe = page.locator('[data-testid="metric-bias-val"]');
    await expect(mbe).toContainText('PSU');

    // Switch back to Temperature
    const tempBtn = page.locator('[data-testid="compare-param-temp-btn"]');
    await tempBtn.click();
    await expect(mbe).toContainText('°C');

    // Close modal
    await page.locator('[data-testid="close-comparison-modal-btn"]').click();
    await expect(modal).not.toBeVisible();
  });

  test('TC03: Switch tabs to Depth Residual Curve and Audit Table, verify CSV export', async ({ page }) => {
    await page.locator('[data-testid="header-compare-btn"]').click();
    const modal = page.locator('[data-testid="model-comparison-modal"]');
    await expect(modal).toBeVisible();

    // Switch to Depth Residuals Tab
    const resTab = page.locator('[data-testid="tab-residuals-btn"]');
    await resTab.click();

    const resSvg = page.locator('[data-testid="residuals-svg"]');
    await expect(resSvg).toBeVisible();
    await expect(page.locator('[data-testid="residual-path"]')).toBeVisible();

    // Switch to Audit Table Tab
    const tableTab = page.locator('[data-testid="tab-audit-table-btn"]');
    await tableTab.click();

    const auditTable = page.locator('[data-testid="comparison-audit-table"]');
    await expect(auditTable).toBeVisible();

    const tableRows = page.locator('[data-testid="comparison-table-row"]');
    expect(await tableRows.count()).toBeGreaterThanOrEqual(5);

    // Verify CSV export button is enabled
    const exportBtn = page.locator('[data-testid="export-comparison-csv-btn"]');
    await expect(exportBtn).toBeVisible();
    await expect(exportBtn).toBeEnabled();

    // Close modal
    await page.locator('[data-testid="close-comparison-modal-btn"]').click();
    await expect(modal).not.toBeVisible();
  });

  test('TC04: Launch comparison from SidebarControls and ComparisonPanel', async ({ page }) => {
    // 1. Launch from SidebarControls launcher
    const sidebarBtn = page.locator('[data-testid="sidebar-compare-btn"]');
    await expect(sidebarBtn).toBeVisible();
    await sidebarBtn.click();

    const modal = page.locator('[data-testid="model-comparison-modal"]');
    await expect(modal).toBeVisible();
    await page.locator('[data-testid="close-comparison-modal-btn"]').click();
    await expect(modal).not.toBeVisible();

    // 2. Select an Argo float to open drawer
    const argoToggle = page.locator('input#layer-argo');
    await argoToggle.check();
    const floatSelect = page.locator('select#argo-float-select');
    await floatSelect.selectOption('ARGO_2902145');

    // Drawer should open
    const drawer = page.locator('[data-testid="inspector-drawer"]');
    await expect(drawer).toBeVisible();

    // Click full suite launcher inside drawer
    const drawerLaunchBtn = page.locator('[data-testid="open-full-comparison-modal-btn"]');
    await expect(drawerLaunchBtn).toBeVisible();
    await drawerLaunchBtn.click();

    // Modal opens with selected float
    await expect(modal).toBeVisible();
    const platformSelect = page.locator('[data-testid="compare-platform-select"]');
    await expect(platformSelect).toHaveValue('ARGO_2902145');

    // Close modal
    await page.locator('[data-testid="close-comparison-modal-btn"]').click();
    await expect(modal).not.toBeVisible();
  });
});
