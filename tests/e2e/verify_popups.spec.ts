import { test, expect } from '@playwright/test';

test.describe('Popup Positioning Verification', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('fitcore.v1', JSON.stringify({
        onboardingComplete: true,
        demoMode: true,
        version: 3
      }));
    });
    await page.reload();
    await expect(page.locator('.phone-shell')).toHaveAttribute('data-section', 'home');
  });

  const verifyViewportPosition = async (page, selector) => {
    // Wait for any entry animations to complete
    await page.waitForTimeout(600);

    const info = await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const s = window.getComputedStyle(el);
      const root = el.closest('.sheet-root');
      const rootR = root ? root.getBoundingClientRect() : null;
      const rootS = root ? window.getComputedStyle(root) : null;

      return {
        rect: { x: r.x, y: r.y, width: r.width, height: r.height, bottom: r.bottom },
        style: { position: s.position, bottom: s.bottom, maxHeight: s.maxHeight },
        rootRect: rootR ? { x: rootR.x, y: rootR.y, width: rootR.width, height: rootR.height, bottom: rootR.bottom } : null,
        rootStyle: rootS ? { position: rootS.position, display: rootS.display, alignItems: rootS.alignItems } : null,
        viewport: { width: window.innerWidth, height: window.innerHeight },
        bodyScroll: document.body.scrollTop || document.documentElement.scrollTop
      };
    }, selector);

    if (!info) {
       console.log(`Element ${selector} NOT found in DOM`);
       return false;
    }

    console.log(`Verification for ${selector}:`, JSON.stringify(info, null, 2));

    const { rect, viewport } = info;

    // Bottom of sheet should be at bottom of viewport
    // Using a slightly wider tolerance for subpixel/rounding
    expect(rect.bottom).toBeLessThanOrEqual(viewport.height + 2);
    expect(rect.bottom).toBeGreaterThanOrEqual(viewport.height - 2);

    // Height should be capped (92dvh)
    expect(rect.height).toBeLessThanOrEqual(viewport.height * 0.93);
    return true;
  };

  test('FitCore Score popup should have correct height and visibility', async ({ page }) => {
    await page.locator('.home-score-panel').click();
    const success = await verifyViewportPosition(page, '.sheet-surface');
    expect(success).toBe(true);
    await page.screenshot({ path: 'tests/e2e/screenshots/verified_score_popup.png' });
  });

  test('Jarvis sheet should have correct height and visibility', async ({ page }) => {
    // Wait for the app to be ready and events to be listenable
    await page.waitForTimeout(1000);
    // Open Jarvis via event to trigger the sheet directly
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('fitcore:open-ai')));

    // Explicitly wait for the sheet to appear
    await expect(page.locator('.sheet-surface')).toBeVisible();
    const success = await verifyViewportPosition(page, '.sheet-surface');
    expect(success).toBe(true);
    await page.screenshot({ path: 'tests/e2e/screenshots/verified_jarvis_sheet.png' });
  });

  test('Log Meal popup should have correct height and visibility', async ({ page }) => {
    await page.getByRole('button', { name: 'Fuel' }).click();
    await page.getByRole('button', { name: 'Log Meal', exact: true }).first().click();
    const success = await verifyViewportPosition(page, '.sheet-surface');
    expect(success).toBe(true);
    await page.screenshot({ path: 'tests/e2e/screenshots/verified_meal_popup.png' });
  });

  test('Jarvis composer bar should be visible and positioned at bottom', async ({ page }) => {
    await page.locator('.command-bar__nav-ai, .command-bar__ai').first().click();
    const composer = page.locator('.command-bar__composer');
    await expect(composer).toBeVisible();

    const rect = await composer.boundingBox();
    const viewport = page.viewportSize();

    if (rect && viewport) {
        // Composer bar should be near the bottom
        expect(rect.y + rect.height).toBeGreaterThan(viewport.height - 120);
        expect(rect.y + rect.height).toBeLessThanOrEqual(viewport.height);
    }
    await page.screenshot({ path: 'tests/e2e/screenshots/verified_jarvis_composer.png' });
  });
});
