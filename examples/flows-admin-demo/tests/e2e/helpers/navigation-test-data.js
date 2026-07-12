/**
 * Navigation Test Data Generator
 *
 * This module provides consistent test data for navigation tests
 * that won't break when demo content changes.
 */

export class NavigationTestData {
  /**
   * Generate minimal test data that ensures all navigation paths are testable
   */
  static generateMinimalTestData() {
    return {
      client: {
        id: 'test-client-1',
        name: 'Test Client',
        logo: null,
      },
      applications: [
        {
          id: 'app-offboarding-1',
          code: 'offboarding-standard',
          name: 'Standard Offboarding',
          type: 'offboarding',
          status: 'active',
          version: '1.0.0',
          features: ['task-management', 'document-upload'],
          configuration: {},
          maxConcurrentUsers: 100,
        },
        {
          id: 'app-onboarding-1',
          code: 'onboarding-basic',
          name: 'Basic Onboarding',
          type: 'onboarding',
          status: 'active',
          version: '1.0.0',
          features: ['invitation-management'],
          configuration: {},
          maxConcurrentUsers: 50,
        },
      ],
      employees: [
        {
          id: 'emp-1',
          firstName: 'Test',
          lastName: 'Employee',
          email: 'test@example.com',
          department: 'Engineering',
          status: 'active',
        },
      ],
      offboardingProcesses: [
        {
          id: 'process-1',
          process_name: 'Test Employee Offboarding',
          employee_department: 'Engineering',
          status: 'active',
          target_completion_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          completion_percentage: 50,
          overdue_tasks: 0,
          priority: 'normal',
        },
        {
          id: 'process-2',
          process_name: 'Urgent Offboarding',
          employee_department: 'Sales',
          status: 'active',
          target_completion_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
          completion_percentage: 25,
          overdue_tasks: 2,
          priority: 'urgent',
        },
        {
          id: 'process-3',
          process_name: 'Pending Approval Process',
          employee_department: 'HR',
          status: 'pending_approval',
          target_completion_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
          completion_percentage: 90,
          overdue_tasks: 0,
          priority: 'high',
        },
      ],
      invitations: [
        {
          id: 'inv-1',
          firstName: 'New',
          lastName: 'Hire',
          companyEmail: 'newhire@example.com',
          status: 'pending',
          applicationId: 'app-onboarding-1',
        },
      ],
    };
  }

  /**
   * Mock the data stores for testing
   */
  static async mockDataStores(page, testData = null) {
    const data = testData || NavigationTestData.generateMinimalTestData();

    await page.addInitScript((injectedData) => {
      // Mock the Svelte stores
      window.__TEST_DATA__ = injectedData;

      // Override the store values when they're accessed
      window.__MOCK_STORES__ = {
        client: injectedData.client,
        clients: [injectedData.client],
        applications: injectedData.applications,
        employees: injectedData.employees,
        invitations: injectedData.invitations,
        enrollments: [],
        loading: false,
        error: null,
      };

      // Intercept store subscriptions
      const originalSubscribe = window.subscribe || (() => {});
      window.subscribe = (store, callback) => {
        if (window.__MOCK_STORES__[store]) {
          callback(window.__MOCK_STORES__[store]);
          return () => {}; // Unsubscribe function
        }
        return originalSubscribe(store, callback);
      };
    }, data);
  }

  /**
   * Wait for navigation to be ready with test data
   */
  static async waitForNavigationReady(page) {
    // Wait for the loading indicator to disappear
    await page.waitForSelector('[data-testid="loading-indicator"]', {
      state: 'hidden',
      timeout: 30000,
    });

    // Wait for at least one tab to be visible
    await page.waitForSelector('[data-testid^="tab-"]', { state: 'visible' });

    // Give a small buffer for any reactive updates
    await page.waitForTimeout(100);
  }

  /**
   * Verify navigation structure matches expectations
   */
  static async verifyNavigationStructure(page) {
    const errors = [];

    // Check for People tab
    const peopleTab = await page.locator('[data-testid="tab-people"]').count();
    if (peopleTab === 0) {
      errors.push('People tab not found');
    }

    // Check for at least one application tab
    const appTabs = await page
      .locator('[data-testid^="tab-"]:not([data-testid="tab-people"])')
      .count();
    if (appTabs === 0) {
      errors.push('No application tabs found');
    }

    // Check for offboarding navigation if on offboarding tab
    const activeTab = await page
      .locator('[data-testid^="tab-"][data-active="true"]')
      .getAttribute('data-testid');
    if (activeTab && activeTab !== 'tab-people') {
      const offboardingViews = await page.locator('[data-testid^="offboarding-view-"]').count();
      if (offboardingViews > 0) {
        // Verify all expected views are present
        const expectedViews = ['overview', 'templates', 'processes'];
        for (const view of expectedViews) {
          const viewButton = await page.locator(`[data-testid="offboarding-view-${view}"]`).count();
          if (viewButton === 0) {
            errors.push(`Offboarding ${view} view button not found`);
          }
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Create a navigation test context that's independent of demo data
   */
  static createTestContext() {
    return {
      // Use data attributes instead of text content
      selectors: {
        tabs: '[data-testid^="tab-"]',
        activeTab: '[data-testid^="tab-"][data-active="true"]',
        peopleTab: '[data-testid="tab-people"]',
        offboardingTabs: '[data-testid^="tab-"][data-testid*="offboarding"]',
        views: {
          people: '[data-testid="view-people"]',
          overview: '[data-testid="view-overview"]',
          templates: '[data-testid="view-templates"]',
          processes: '[data-testid="view-processes"]',
          tasks: '[data-testid="view-tasks"]',
        },
        buttons: {
          createOffboarding: '[data-testid="action-create-offboarding"]',
          viewAllNeedsAttention: '[data-testid="action-view-all-needs-attention"]',
        },
        metrics: {
          activeProcesses: '[data-testid="metric-active-processes"]',
          endingSoon: '[data-testid="metric-ending-soon"]',
          recentlyCompleted: '[data-testid="metric-recently-completed"]',
          needsAttention: '[data-testid="metric-needs-attention"]',
        },
        filters: {
          overdue: '[data-testid="filter-overdue-processes"]',
          pendingApprovals: '[data-testid="filter-pending-approvals"]',
          thisMonth: '[data-testid="filter-this-month"]',
        },
      },

      // Helper functions that work with any data
      helpers: {
        getFirstApplicationTab: async (page) => {
          return page.locator('[data-testid^="tab-"]:not([data-testid="tab-people"])').first();
        },

        getOffboardingTab: async (page) => {
          // Try to find by type first, fallback to any app tab
          const offboardingTab = await page
            .locator('[data-testid^="tab-"][data-testid*="offboarding"]')
            .first();
          if ((await offboardingTab.count()) > 0) {
            return offboardingTab;
          }
          // Fallback to first non-people tab
          return page.locator('[data-testid^="tab-"]:not([data-testid="tab-people"])').first();
        },

        waitForViewTransition: async (page, viewTestId) => {
          await page.waitForSelector(`[data-testid="${viewTestId}"]`, { state: 'visible' });
          await page.waitForTimeout(100); // Small buffer for animations
        },
      },
    };
  }
}

// Export convenience functions
export const setupNavigationTest = NavigationTestData.mockDataStores.bind(NavigationTestData);
export const waitForNavigation = NavigationTestData.waitForNavigationReady.bind(NavigationTestData);
export const verifyNavigation =
  NavigationTestData.verifyNavigationStructure.bind(NavigationTestData);
export const getTestContext = NavigationTestData.createTestContext.bind(NavigationTestData);
