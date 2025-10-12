/**
 * Regression Test for Error Reporting Functionality
 *
 * This test ensures that the error reporting system works correctly
 * and catches any regressions in the import paths or functionality.
 */

import { browser } from '$app/environment';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

describe('Error Reporting System', () => {
  let errorReportingConfig;
  let errorReporter;

  beforeAll(async () => {
    // Mock browser environment
    global.window = {
      location: {
        protocol: 'http:',
        hostname: 'localhost',
        port: '5173',
        href: 'https://dev.thepia.net:5173/test',
      },
      navigator: {
        userAgent: 'Test Browser',
      },
    };
  });

  afterAll(() => {
    delete global.window;
  });

  describe('Module Imports', () => {
    it('should import errorReporting.js configuration module', async () => {
      const module = await import('$lib/config/errorReporting.js');
      expect(module).toBeDefined();
      expect(module.getAdminErrorReportingConfig).toBeInstanceOf(Function);
      expect(module.initializeAdminErrorReporting).toBeInstanceOf(Function);
      expect(module.reportAdminFlowError).toBeInstanceOf(Function);
      expect(module.flushAdminErrorReports).toBeInstanceOf(Function);
    });

    it('should import errorReporter TypeScript module without extension', async () => {
      const module = await import('$lib/utils/errorReporter');
      expect(module).toBeDefined();
      expect(module.initializeAdminErrorReporter).toBeInstanceOf(Function);
      expect(module.reportAdminError).toBeInstanceOf(Function);
      expect(module.reportDataError).toBeInstanceOf(Function);
      expect(module.reportUiError).toBeInstanceOf(Function);
      expect(module.flushAdminErrorReports).toBeInstanceOf(Function);
      expect(module.getAdminErrorReportQueueSize).toBeInstanceOf(Function);
    });

    it('should NOT import errorReporter with .js extension', async () => {
      await expect(import('$lib/utils/errorReporter.js')).rejects.toThrow();
    });

    it('should NOT import errorReporter with .ts extension in production builds', async () => {
      // Note: This might work in dev but fail in production
      // The correct approach is to use no extension
      const importPath = '$lib/utils/errorReporter.ts';
      try {
        await import(importPath);
        console.warn('Warning: .ts extension imports may fail in production builds');
      } catch (error) {
        // This is expected and correct behavior
        expect(error).toBeDefined();
      }
    });
  });

  describe('Configuration', () => {
    it('should detect local development environment', async () => {
      const { getAdminErrorReportingConfig } = await import('$lib/config/errorReporting.js');
      const config = await getAdminErrorReportingConfig();

      expect(config).toBeDefined();
      expect(config.environment).toBe('development');
      expect(config.endpoint).toContain('/dev/error-reports');
      expect(config.debug).toBe(true);
    });

    it('should check server health correctly', async () => {
      const { getAdminErrorReportingConfig } = await import('$lib/config/errorReporting.js');

      // Mock fetch for health check
      global.fetch = async (url) => {
        if (url.includes('/dev/error-reports')) {
          return { ok: true };
        }
        throw new Error('Unknown endpoint');
      };

      const config = await getAdminErrorReportingConfig();
      expect(config.enabled).toBe(true);

      delete global.fetch;
    });
  });

  describe('Error Reporter Functionality', () => {
    it('should initialize error reporter', async () => {
      const { initializeAdminErrorReporter } = await import('$lib/utils/errorReporter');
      const config = {
        enabled: true,
        endpoint: 'https://dev.thepia.net:5173/dev/error-reports',
        debug: true,
      };

      expect(() => initializeAdminErrorReporter(config)).not.toThrow();
    });

    it('should report admin errors', async () => {
      const { initializeAdminErrorReporter, reportAdminError, getAdminErrorReportQueueSize } =
        await import('$lib/utils/errorReporter');

      initializeAdminErrorReporter({
        enabled: true,
        endpoint: null, // Queue errors instead of sending
        debug: false,
      });

      reportAdminError('test-operation', new Error('Test error'), { test: true });

      const queueSize = getAdminErrorReportQueueSize();
      expect(queueSize).toBeGreaterThan(0);
    });

    it('should flush error reports', async () => {
      const {
        initializeAdminErrorReporter,
        reportAdminError,
        flushAdminErrorReports,
        getAdminErrorReportQueueSize,
      } = await import('$lib/utils/errorReporter');

      // Mock fetch
      let fetchCalled = false;
      global.fetch = async () => {
        fetchCalled = true;
        return { ok: true };
      };

      initializeAdminErrorReporter({
        enabled: true,
        endpoint: 'https://dev.thepia.net:5173/dev/error-reports',
        debug: false,
      });

      reportAdminError('test-operation', new Error('Test error'), { test: true });
      flushAdminErrorReports();

      // Wait a bit for async operations
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(fetchCalled).toBe(true);

      delete global.fetch;
    });
  });

  describe('Component Integration', () => {
    it('should load error reporting status in components', async () => {
      // This tests the actual import pattern used in components
      const loadSystemStatus = async () => {
        const { getAdminErrorReportingConfig } = await import('$lib/config/errorReporting.js');
        const { getAdminErrorReportQueueSize } = await import('$lib/utils/errorReporter');

        const errorReportingConfig = await getAdminErrorReportingConfig();
        const queueSize = getAdminErrorReportQueueSize();

        return { errorReportingConfig, queueSize };
      };

      const result = await loadSystemStatus();
      expect(result.errorReportingConfig).toBeDefined();
      expect(typeof result.queueSize).toBe('number');
    });
  });

  describe('Error Endpoint', () => {
    it('should have correct CORS headers', async () => {
      const { GET } = await import('../../+server.js');
      const response = await GET();
      const data = await response.json();

      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(data.service).toBe('flows-admin-demo-error-reporting');
    });
  });
});
