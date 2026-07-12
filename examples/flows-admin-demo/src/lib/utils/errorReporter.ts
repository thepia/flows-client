/**
 * Error Reporting Utilities for Flows Admin Demo
 *
 * Purpose: Configurable error reporting for admin dashboard issues during development
 * Context: This enables debugging of Supabase data loading, UI errors, and admin flow issues
 */

export interface AdminErrorEvent {
  type: 'admin-error';
  operation: 'data-load' | 'api-call' | 'ui-interaction' | 'auth-error' | 'validation-error';
  error: any;
  context?: Record<string, any>;
}

export interface DataErrorEvent {
  type: 'data-error';
  table: string;
  operation: 'select' | 'insert' | 'update' | 'delete';
  error: any;
  context?: Record<string, any>;
}

export interface UiErrorEvent {
  type: 'ui-error';
  component: string;
  action: string;
  error: any;
  context?: Record<string, any>;
}

export type AdminErrorReportEvent = AdminErrorEvent | DataErrorEvent | UiErrorEvent;

export interface ErrorReporterConfig {
  enabled: boolean;
  endpoint?: string;
  debug?: boolean;
  maxRetries?: number;
  retryDelay?: number;
}

class AdminErrorReporter {
  private config: ErrorReporterConfig;
  private queue: AdminErrorReportEvent[] = [];
  private retryQueue: { event: AdminErrorReportEvent; attempts: number }[] = [];

  constructor(config: ErrorReporterConfig = { enabled: false }) {
    this.config = {
      maxRetries: 3,
      retryDelay: 1000,
      debug: false,
      ...config,
    };
  }

  updateConfig(config: Partial<ErrorReporterConfig>) {
    this.config = { ...this.config, ...config };
  }

  async report(event: AdminErrorReportEvent) {
    if (!this.config.enabled) {
      if (this.config.debug) {
        console.log('📊 [AdminErrorReporter] Event (reporting disabled):', event);
      }
      return;
    }

    if (this.config.debug) {
      console.log('📊 [AdminErrorReporter] Reporting event:', event);
    }

    if (!this.config.endpoint) {
      this.queue.push(event);
      if (this.config.debug) {
        console.warn('📊 [AdminErrorReporter] No endpoint configured, queuing event');
      }
      return;
    }

    try {
      await this.sendEvent(event);
    } catch (error) {
      console.warn('📊 [AdminErrorReporter] Failed to send event:', error);
      this.retryQueue.push({ event, attempts: 0 });
      this.scheduleRetry();
    }
  }

  private async sendEvent(event: AdminErrorReportEvent) {
    const payload = {
      ...event,
      timestamp: Date.now(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
      app: 'flows-admin-demo',
      version: '1.0.0',
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    let response: Response;
    try {
      response = await fetch(this.config.endpoint!, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
    } catch (error) {
      throw new Error(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    if (this.config.debug) {
      console.log('📊 [AdminErrorReporter] Event sent successfully');
    }
  }

  private scheduleRetry() {
    setTimeout(() => {
      this.processRetryQueue();
    }, this.config.retryDelay);
  }

  private async processRetryQueue() {
    const failedRetries: { event: AdminErrorReportEvent; attempts: number }[] = [];

    for (const { event, attempts } of this.retryQueue) {
      if (attempts >= this.config.maxRetries!) {
        if (this.config.debug) {
          console.warn('📊 [AdminErrorReporter] Max retries reached for event:', event);
        }
        continue;
      }

      try {
        await this.sendEvent(event);
      } catch (_error) {
        failedRetries.push({ event, attempts: attempts + 1 });
      }
    }

    this.retryQueue = failedRetries;

    if (this.retryQueue.length > 0) {
      this.scheduleRetry();
    }
  }

  flushQueue() {
    if (!this.config.endpoint) {
      console.warn('📊 [AdminErrorReporter] Cannot flush queue: no endpoint configured');
      return;
    }

    const queuedEvents = [...this.queue];
    this.queue = [];

    for (const event of queuedEvents) {
      this.report(event);
    }
  }

  getQueueSize() {
    return this.queue.length + this.retryQueue.length;
  }
}

// Global reporter instance
let reporter: AdminErrorReporter | null = null;

export function initializeAdminErrorReporter(config: ErrorReporterConfig) {
  reporter = new AdminErrorReporter(config);

  if (config.debug) {
    console.log('📊 [AdminErrorReporter] Initialized with config:', config);
  }
}

export function updateAdminErrorReporterConfig(config: Partial<ErrorReporterConfig>) {
  if (!reporter) {
    console.warn(
      '📊 [AdminErrorReporter] Not initialized. Call initializeAdminErrorReporter first.'
    );
    return;
  }

  reporter.updateConfig(config);
}

export function reportAdminError(
  operation: AdminErrorEvent['operation'],
  error: any,
  context?: Record<string, any>
) {
  if (!reporter) return;

  reporter.report({
    type: 'admin-error',
    operation,
    error: {
      name: error?.name,
      message: error?.message,
      code: error?.code,
      stack: error?.stack,
    },
    context,
  });
}

export function reportDataError(
  table: string,
  operation: DataErrorEvent['operation'],
  error: any,
  context?: Record<string, any>
) {
  if (!reporter) return;

  reporter.report({
    type: 'data-error',
    table,
    operation,
    error: {
      name: error?.name,
      message: error?.message,
      code: error?.code,
      details: error?.details,
      hint: error?.hint,
    },
    context,
  });
}

export function reportUiError(
  component: string,
  action: string,
  error: any,
  context?: Record<string, any>
) {
  if (!reporter) return;

  reporter.report({
    type: 'ui-error',
    component,
    action,
    error: {
      name: error?.name,
      message: error?.message,
      stack: error?.stack,
    },
    context,
  });
}

export function flushAdminErrorReports() {
  if (!reporter) return;
  reporter.flushQueue();
}

export function getAdminErrorReportQueueSize() {
  if (!reporter) return 0;
  return reporter.getQueueSize();
}
