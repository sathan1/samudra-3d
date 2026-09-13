import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const evidenceDir = path.resolve('..', 'docs', 'evidence', 'probe-sidebar');
mkdirSync(evidenceDir, { recursive: true });

test.describe('Full View Globe Navigation & Location Probe Sidebar', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 950 });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Indian Ocean workspace' })).toBeVisible();
    await page.locator('.subtle-tag', { hasText: '3D Thermal Layer Active' }).waitFor({ timeout: 5000 }).catch(() => {});
  });

  test('1. Expansive globe view, standby navigator card, and quick basin probe', async ({ page }) => {
    // 1. Initial state: Inspector drawer is collapsed, standby card is visible in drawer
    const drawer = page.locator('[data-testid="inspector-drawer"]');
    await expect(drawer).toBeVisible();
    await expect(page.locator('.location-navigator-standby')).toBeVisible();
    await expect(page.locator('.location-navigator-standby')).toContainText('Interactive Location Probe');

    // 2. Click Arabian Sea quick basin probe
    const arabianSeaBtn = page.locator('.location-navigator-standby span[role="button"]', { hasText: 'Arabian Sea' });
    await expect(arabianSeaBtn).toBeVisible();
    await arabianSeaBtn.click();

    // 3. Probed Station Section should become active
    const probedSection = page.locator('.probed-station-section');
    await expect(probedSection).toBeVisible();
    await expect(probedSection).toContainText('Virtual CTD Probe Sounding');

    // Wait for probe metrics to resolve
    await expect(page.locator('.probed-station-section .metrics-grid')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('.probed-station-section')).toContainText('SST (Surface Temp)');
    await expect(page.locator('.probed-station-section')).toContainText('Mixed Layer Depth (MLD)');
    await expect(page.locator('.probed-station-section')).toContainText('Thermocline (D20)');

    // 4. Floating canvas chip should be visible
    const floatingChip = page.locator('.probed-floating-chip');
    await expect(floatingChip).toBeVisible();
    await expect(floatingChip).toContainText('15°N, 68°E');

    // Screenshot 1: Probed Arabian Sea Water Column
    await page.screenshot({ path: path.join(evidenceDir, '01-arabian-sea-probe-sidebar.png'), fullPage: true });

    // 5. Close the drawer
    const closeBtn = page.locator('[data-testid="close-inspector-drawer-btn"]');
    await closeBtn.click();
    await expect(page.locator('.probed-station-section')).not.toBeVisible();
    await expect(page.locator('.location-navigator-standby')).toBeVisible();

    // Screenshot 2: Closed drawer returning to expansive globe navigation
    await page.screenshot({ path: path.join(evidenceDir, '02-closed-drawer-globe-navigate.png'), fullPage: true });
  });

  test('2. Full View Globe toggle activates cinema-mode and restores docked view', async ({ page }) => {
    const fullViewBtn = page.locator('[data-testid="toggle-full-view-btn"]');
    await expect(fullViewBtn).toBeVisible();
    await expect(fullViewBtn).toHaveText('⛶ Full View Globe');

    // Click to activate Full View Globe
    await fullViewBtn.click();
    await expect(page.locator('.dashboard')).toHaveClass(/full-view-mode/);
    await expect(page.locator('section.viewport')).toHaveClass(/full-view-active/);
    await expect(fullViewBtn).toHaveText('◱ Standard View');

    // Sidebars should be hidden in full view mode
    await expect(page.locator('aside.controls')).not.toBeVisible();
    await expect(page.locator('aside.inspection')).not.toBeVisible();

    // Screenshot 3: Full View Globe mode
    await page.screenshot({ path: path.join(evidenceDir, '03-full-view-globe-cinema-mode.png'), fullPage: true });

    // Click to restore standard docked view
    await fullViewBtn.click();
    await expect(page.locator('.dashboard')).not.toHaveClass(/full-view-mode/);
    await expect(page.locator('aside.controls')).toBeVisible();
    await expect(page.locator('aside.inspection')).toBeVisible();
    await expect(fullViewBtn).toHaveText('⛶ Full View Globe');

    // Screenshot 4: Restored standard docked view
    await page.screenshot({ path: path.join(evidenceDir, '04-restored-standard-view.png'), fullPage: true });
  });

  test('3. Canvas click raycast drops probe and updates sidebar', async ({ page }) => {
    // Click on canvas center to probe the Northern Indian Ocean
    const canvas = page.locator('[data-testid="three-canvas-container"] canvas');
    await expect(canvas).toBeVisible();

    const box = await canvas.boundingBox();
    if (box) {
      // Click near center-bottom (Indian Ocean region)
      await page.mouse.click(box.x + box.width * 0.52, box.y + box.height * 0.5);
    }

    // Probed station or floating chip should appear
    await page.waitForTimeout(500);
    const chipOrSection = page.locator('.probed-floating-chip, .probed-station-section');
    await expect(chipOrSection.first()).toBeVisible({ timeout: 5000 });

    // Screenshot 5: Click-to-probe on 3D Globe
    await page.screenshot({ path: path.join(evidenceDir, '05-click-to-probe-globe-interaction.png'), fullPage: true });
  });
});
