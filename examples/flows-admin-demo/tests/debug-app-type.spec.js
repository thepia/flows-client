import { expect, test } from '@playwright/test';

test.describe('Debug Application Type', () => {
  test('should log application details when clicking tabs', async ({ page }) => {
    // Enable console logging
    const consoleMessages = [];
    page.on('console', (msg) => {
      if (msg.text().includes('🚀 Application tab clicked')) {
        consoleMessages.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForSelector('[data-testid="app-loaded"]');
    await page.waitForTimeout(3000);

    // Get application tabs
    const appTabs = await page
      .locator(
        '[data-testid^="tab-"]:not([data-testid="tab-people"]):not([data-testid="tab-processes"]):not([data-testid="tab-account"])'
      )
      .all();

    if (appTabs.length === 0) {
      console.log('❌ No application tabs found');
      return;
    }

    console.log(`Found ${appTabs.length} application tabs`);

    for (const tab of appTabs) {
      const tabText = await tab.textContent();
      const testId = await tab.getAttribute('data-testid');

      console.log(`\nClicking tab: "${tabText.trim()}" (${testId})`);
      await tab.click();
      await page.waitForTimeout(1000);
    }

    // Wait a bit for all console messages
    await page.waitForTimeout(1000);

    console.log('\n--- Console Messages ---');
    for (const msg of consoleMessages) {
      console.log(msg);
    }

    // Check what activeTab value is actually set
    const currentActiveTab = await page.evaluate(() => {
      // Try to access the current activeTab if exposed somehow
      return document.querySelector('[data-active="true"]')?.getAttribute('data-testid');
    });

    console.log(`\nCurrent active tab: ${currentActiveTab}`);

    console.log('\n✅ Debug completed');
  });
});
