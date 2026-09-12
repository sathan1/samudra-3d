import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const outDir = path.resolve('..', 'docs', 'evidence', 'refreshed-ui');
mkdirSync(outDir, { recursive: true });

test.describe('Refreshed UI & Creative Agency Design Preview', () => {
  test('Capture high-resolution preview screenshots', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 920 });
    await page.goto('/');

    await expect(page.getByRole('heading', { name: 'Indian Ocean workspace' })).toBeVisible();
    await expect(page.locator('canvas')).toBeVisible();

    // Allow 3D canvas and scalar field to render
    await page.waitForTimeout(2500);

    // 1. Capture Refreshed Dashboard Overview
    await page.screenshot({ path: path.join(outDir, '01-refreshed-deep-sea-dashboard.png'), fullPage: true });

    // 2. Open Officer Portal (LoginModal)
    const loginBtn = page.locator('[data-testid="open-login-btn"]');
    await expect(loginBtn).toBeVisible();
    await loginBtn.click();

    await expect(page.locator('[data-testid="login-modal-card"]')).toBeVisible();
    await page.waitForTimeout(1000);

    // Capture Login Modal Portal
    await page.screenshot({ path: path.join(outDir, '02-refreshed-officer-portal-modal.png'), fullPage: true });

    // Fill sample credentials
    await page.locator('[data-testid="login-officer-input"]').fill('INCOIS-LEAD-26067');
    await page.locator('[data-testid="login-passphrase-input"]').fill('Submerged-Cipher-Omega');
    await page.locator('[data-testid="login-submit-btn"]').click();

    await expect(page.locator('[data-testid="login-status-msg"]')).toBeVisible();
    await page.screenshot({ path: path.join(outDir, '03-officer-portal-authenticated-state.png'), fullPage: true });
  });
});
