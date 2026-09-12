import { test, expect } from '@playwright/test';

test.describe('MoES/INCOIS Operational Authentication & Brand Scrubbing Suite', () => {
  test('verifies official branding and scrubbed taglines', async ({ page }) => {
    await page.goto('/');

    // 1. Verify Platform Label uses official operational title
    const phaseLabel = page.locator('.phase-label');
    await expect(phaseLabel).toBeVisible();
    await expect(phaseLabel).toContainText('OPERATIONAL PLATFORM // MOES-INCOIS');

    // 2. Verify Official Footer Branding (zero SIH/hackathon tagline)
    const footer = page.locator('.workspace-footer');
    await expect(footer).toBeVisible();
    await expect(footer).toContainText('Ministry of Earth Sciences (MoES)');
    await expect(footer).toContainText('INCOIS Ocean Information Services');
    await expect(footer).not.toContainText('SIH26067');
    await expect(footer).not.toContainText('Nexus Nova');
  });

  test('executes complete MoES/INCOIS officer login, persona switch, and sign-out lifecycle', async ({ page }) => {
    await page.goto('/');

    // 1. Verify initial unauthenticated state
    const openLoginBtn = page.locator('[data-testid="open-login-btn"]');
    await expect(openLoginBtn).toBeVisible();
    await expect(openLoginBtn).toContainText('Officer Portal');

    // 2. Open Login Portal Modal
    await openLoginBtn.click();
    const modal = page.locator('[data-testid="login-modal-card"]');
    await expect(modal).toBeVisible();
    await expect(modal).toContainText('OPERATIONAL COMMAND PORTAL // MOES-INCOIS');

    // 3. Verify Quick Persona Switcher Chips are present
    const chiefChip = page.locator('[data-testid="persona-chip-chief_oceanographer"]');
    const navyChip = page.locator('[data-testid="persona-chip-naval_operations"]');
    const resChip = page.locator('[data-testid="persona-chip-research_observer"]');

    await expect(chiefChip).toBeVisible();
    await expect(navyChip).toBeVisible();
    await expect(resChip).toBeVisible();

    // 4. Authenticate as Chief Oceanographer using quick persona chip
    await chiefChip.click();

    // Verify status message confirms authentication handshake
    const statusMsg = page.locator('[data-testid="login-status-msg"]');
    await expect(statusMsg).toBeVisible({ timeout: 5000 });
    await expect(statusMsg).toContainText('Dr. M. Ravichandran');

    // Wait for modal transition or close if still open
    await page.waitForTimeout(1000);
    if (await modal.isVisible()) {
      await page.locator('[data-testid="login-close-btn"]').click();
    }

    // 5. Verify Header displays Authenticated Officer Badge with Level-3 Command
    await expect(page.locator('[data-testid="open-login-btn"]')).toContainText('Dr. M. Ravichandran');
    const signoutBtn = page.locator('[data-testid="header-signout-btn"]');
    await expect(signoutBtn).toBeVisible();

    // 6. Sign Out and verify clean reversion to public viewer mode
    await signoutBtn.click();
    await expect(page.locator('[data-testid="open-login-btn"]')).toContainText('Officer Portal');
    await expect(signoutBtn).not.toBeVisible();
  });
});
