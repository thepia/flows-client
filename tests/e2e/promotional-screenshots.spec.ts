import { expect, type Page, test } from '@playwright/test';
import { promises as fs } from 'fs';
import path from 'path';

// Screenshot configuration
const SCREENSHOT_CONFIG = {
  desktop: {
    outputDir: '/Volumes/Projects/Thepia/thepia.com/src/assets/flows-demo/desktop',
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
  },
  tablet: {
    outputDir: '/Volumes/Projects/Thepia/thepia.com/src/assets/flows-demo/tablet',
    viewport: { width: 1024, height: 768 },
    deviceScaleFactor: 2,
  },
};

// Helper function to wait for page to be fully loaded
async function waitForPageReady(page: Page) {
  // Wait for network to be idle
  await page.waitForLoadState('networkidle');

  // Wait for any loading animations to complete
  await page.waitForTimeout(2000);

  // Wait for main content to be visible
  await page
    .waitForSelector('[data-testid="main-content"], main, .main-content', {
      timeout: 10000,
      state: 'visible',
    })
    .catch(() => {
      console.log('Main content selector not found, continuing...');
    });
}

// Helper function to take and save screenshot
async function takePromotionalScreenshot(
  page: Page,
  filename: string,
  deviceType: keyof typeof SCREENSHOT_CONFIG,
  options: {
    fullPage?: boolean;
    clip?: { x: number; y: number; width: number; height: number };
  } = {}
) {
  const config = SCREENSHOT_CONFIG[deviceType];
  const outputPath = path.join(config.outputDir, `${filename}.png`);

  console.log(`📸 Capturing ${deviceType} screenshot: ${filename}`);

  await page.screenshot({
    path: outputPath,
    fullPage: options.fullPage || false,
    clip: options.clip,
    animations: 'disabled',
    ...options,
  });

  console.log(`✅ Saved screenshot: ${outputPath}`);
}

test.describe('Flows Admin Demo - Promotional Screenshots', () => {
  test.beforeEach(async ({ page }) => {
    // Set longer timeout for demo app
    test.setTimeout(120000);

    // Navigate to the demo app
    await page.goto('/');
    await waitForPageReady(page);
  });

  test('Dashboard Overview - Desktop', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'Desktop screenshots only on Chromium');

    // Wait for dashboard to load
    await page.waitForSelector('[data-testid="dashboard"], .dashboard, h1', { timeout: 15000 });

    // Take full page screenshot of dashboard
    await takePromotionalScreenshot(page, 'dashboard-overview', 'desktop', { fullPage: true });

    // Take focused screenshot of metrics section
    const metricsSection = page.locator('[data-testid="metrics"], .metrics, .stats').first();
    if (await metricsSection.isVisible()) {
      const box = await metricsSection.boundingBox();
      if (box) {
        await takePromotionalScreenshot(page, 'dashboard-metrics', 'desktop', { clip: box });
      }
    }
  });

  test('Employee Management - Desktop', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'Desktop screenshots only on Chromium');

    // Navigate to employees section if it exists
    const employeesLink = page.locator('a[href*="employee"], a[href*="people"], nav a').first();
    if (await employeesLink.isVisible()) {
      await employeesLink.click();
      await waitForPageReady(page);
    }

    // Take screenshot of employee list
    await takePromotionalScreenshot(page, 'employee-management', 'desktop', { fullPage: true });

    // Try to capture employee detail view
    const firstEmployee = page
      .locator('[data-testid*="employee"], .employee-card, .employee-row')
      .first();
    if (await firstEmployee.isVisible()) {
      await firstEmployee.click();
      await waitForPageReady(page);
      await takePromotionalScreenshot(page, 'employee-detail', 'desktop', { fullPage: true });
    }
  });

  test('Tablet Views', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'Tablet screenshots only on Chromium');

    // Set tablet viewport
    await page.setViewportSize(SCREENSHOT_CONFIG.tablet.viewport);

    // Dashboard tablet view
    await page.goto('/');
    await waitForPageReady(page);
    await takePromotionalScreenshot(page, 'dashboard-tablet', 'tablet', { fullPage: true });

    // Employee management tablet view
    const employeesLink = page.locator('a[href*="employee"], a[href*="people"], nav a').first();
    if (await employeesLink.isVisible()) {
      await employeesLink.click();
      await waitForPageReady(page);
      await takePromotionalScreenshot(page, 'employee-management-tablet', 'tablet', {
        fullPage: true,
      });
    }
  });
});
