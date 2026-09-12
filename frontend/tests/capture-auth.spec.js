import { test } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const outDir = path.resolve('..', 'docs', 'evidence', 'operational-auth');
fs.mkdirSync(outDir, { recursive: true });

test('captures high-resolution evidence for MoES/INCOIS operational auth & brand scrubbing', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.waitForTimeout(2500);

  // 1. Capture Official Dashboard Overview
  await page.screenshot({ path: path.join(outDir, '01-official-dashboard-moes-incois.png'), fullPage: true });

  // 2. Open Login Portal
  await page.locator('[data-testid="open-login-btn"]').click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(outDir, '02-operational-login-modal-personas.png'), fullPage: true });

  // 3. Quick-Login as Chief Oceanographer
  await page.locator('[data-testid="persona-chip-chief_oceanographer"]').click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outDir, '03-chief-oceanographer-authenticated.png'), fullPage: true });

  // 4. Open Modal again to inspect active session card
  await page.locator('[data-testid="open-login-btn"]').click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(outDir, '04-active-session-credentials.png'), fullPage: true });

  // 5. Sign Out and switch to Naval Operations
  await page.locator('[data-testid="login-signout-btn"]').click();
  await page.waitForTimeout(800);
  await page.locator('[data-testid="persona-chip-naval_operations"]').click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outDir, '05-naval-operations-tactical.png'), fullPage: true });
});
