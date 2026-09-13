import { test, expect } from '@playwright/test';
import path from 'node:path';

const evidenceDir = path.resolve('..', 'docs', 'evidence', 'auth-and-light-theme');

test('capture AuthGate and Light Theme visual evidence', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 950 });

  // 1. Visit unauthenticated /app in dark mode
  await page.goto('/app');
  await page.evaluate(() => {
    window.sessionStorage.setItem('samudra_signed_out', 'true');
    window.localStorage.setItem('samudra_signed_out', 'true');
    window.localStorage.removeItem('samudra_auth_token');
  });
  await page.reload();

  await expect(page.locator('[data-testid="auth-gate"]')).toBeVisible();
  await page.screenshot({ path: path.join(evidenceDir, '01-auth-gate-dark.png') });

  // 2. Switch to light theme on AuthGate
  await page.click('button.theme-button');
  await expect(page.locator('.app')).toHaveAttribute('data-theme', 'light');
  await page.waitForTimeout(400); // Allow CSS color transitions to settle
  await page.screenshot({ path: path.join(evidenceDir, '02-auth-gate-light.png') });

  // 3. Authenticate using form login
  await page.fill('[data-testid="auth-username-input"]', 'admin');
  await page.fill('[data-testid="auth-password-input"]', 'Samudra#Admin2026!');
  await page.click('[data-testid="auth-submit-btn"]');
  await expect(page.locator('#workspace')).toBeVisible({ timeout: 8000 });
  await expect(page.locator('canvas')).toBeVisible({ timeout: 8000 });
  await page.waitForTimeout(2000); // Allow globe textures and WebGL to stabilize
  await page.screenshot({ path: path.join(evidenceDir, '03-workspace-light-mode.png') });

  // 4. Probe an active basin (Arabian Sea) in Light Theme
  const arabianBtn = page.locator('span[role="button"]:has-text("Arabian Sea")').first();
  if (await arabianBtn.isVisible()) {
    await arabianBtn.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(evidenceDir, '04-probed-water-column-light.png') });
  }

  // 5. Toggle Full View Mode
  const fullViewBtn = page.locator('[data-testid="toggle-full-view-btn"]');
  if (await fullViewBtn.isVisible()) {
    await fullViewBtn.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(evidenceDir, '05-full-view-mode-light.png') });
  }

  // Cleanup session flag
  await page.evaluate(() => {
    try {
      window.sessionStorage.removeItem('samudra_signed_out');
      window.localStorage.removeItem('samudra_signed_out');
    } catch {}
  });
});
