# Setting Up Error Reporting in Thepia Demo Applications

## Overview

This guide documents how to implement comprehensive error reporting in Thepia demo applications, based on the flows-auth error reporting patterns. The implementation provides development-time error logging with rich console formatting and automatic error capture.

## Architecture

### Core Components

1. **Error Reporter Utility** - Queue-based error reporting with retry logic
2. **Configuration System** - Smart server detection and environment handling
3. **Server Endpoint** - Development server endpoint for receiving error reports
4. **Integration Layer** - Automatic error capture in data operations and UI components

### Error Types Supported

- **Admin/App Errors** - General application operation errors
- **Data Errors** - Database/API operation errors  
- **UI Errors** - Component-specific interaction errors

## Implementation Steps

### 1. Create Core Error Reporter

Create `/src/lib/utils/errorReporter.ts`:

```typescript
/**
 * Error Reporting Utilities for [App Name] Demo
 */

export interface AppErrorEvent {
  type: 'app-error';
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

export type AppErrorReportEvent = AppErrorEvent | DataErrorEvent | UiErrorEvent;

export interface ErrorReporterConfig {
  enabled: boolean;
  endpoint?: string;
  debug?: boolean;
  maxRetries?: number;
  retryDelay?: number;
}

class AppErrorReporter {
  private config: ErrorReporterConfig;
  private queue: AppErrorReportEvent[] = [];
  private retryQueue: { event: AppErrorReportEvent; attempts: number }[] = [];

  constructor(config: ErrorReporterConfig = { enabled: false }) {
    this.config = {
      maxRetries: 3,
      retryDelay: 1000,
      debug: false,
      ...config
    };
  }

  updateConfig(config: Partial<ErrorReporterConfig>) {
    this.config = { ...this.config, ...config };
  }

  async report(event: AppErrorReportEvent) {
    if (!this.config.enabled) {
      if (this.config.debug) {
        console.log('📊 [AppErrorReporter] Event (reporting disabled):', event);
      }
      return;
    }

    if (this.config.debug) {
      console.log('📊 [AppErrorReporter] Reporting event:', event);
    }

    if (!this.config.endpoint) {
      this.queue.push(event);
      if (this.config.debug) {
        console.warn('📊 [AppErrorReporter] No endpoint configured, queuing event');
      }
      return;
    }

    try {
      await this.sendEvent(event);
    } catch (error) {
      console.warn('📊 [AppErrorReporter] Failed to send event:', error);
      this.retryQueue.push({ event, attempts: 0 });
      this.scheduleRetry();
    }
  }

  private async sendEvent(event: AppErrorReportEvent) {
    const payload = {
      ...event,
      timestamp: Date.now(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
      app: '[app-name]', // Replace with your app name
      version: '1.0.0'
    };

    const response = await fetch(this.config.endpoint!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  }

  private scheduleRetry() {
    setTimeout(() => this.processRetryQueue(), this.config.retryDelay);
  }

  private async processRetryQueue() {
    const failedRetries: { event: AppErrorReportEvent; attempts: number }[] = [];

    for (const { event, attempts } of this.retryQueue) {
      if (attempts >= this.config.maxRetries!) {
        if (this.config.debug) {
          console.warn('📊 [AppErrorReporter] Max retries reached for event:', event);
        }
        continue;
      }

      try {
        await this.sendEvent(event);
      } catch (error) {
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
      console.warn('📊 [AppErrorReporter] Cannot flush queue: no endpoint configured');
      return;
    }

    const queuedEvents = [...this.queue];
    this.queue = [];
    queuedEvents.forEach(event => this.report(event));
  }

  getQueueSize() {
    return this.queue.length + this.retryQueue.length;
  }
}

// Global reporter instance
let reporter: AppErrorReporter | null = null;

export function initializeAppErrorReporter(config: ErrorReporterConfig) {
  reporter = new AppErrorReporter(config);
  if (config.debug) {
    console.log('📊 [AppErrorReporter] Initialized with config:', config);
  }
}

export function updateAppErrorReporterConfig(config: Partial<ErrorReporterConfig>) {
  if (!reporter) {
    console.warn('📊 [AppErrorReporter] Not initialized. Call initializeAppErrorReporter first.');
    return;
  }
  reporter.updateConfig(config);
}

export function reportAppError(operation: AppErrorEvent['operation'], error: any, context?: Record<string, any>) {
  if (!reporter) return;
  reporter.report({
    type: 'app-error',
    operation,
    error: {
      name: error?.name,
      message: error?.message,
      code: error?.code,
      stack: error?.stack
    },
    context
  });
}

export function reportDataError(table: string, operation: DataErrorEvent['operation'], error: any, context?: Record<string, any>) {
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
      hint: error?.hint
    },
    context
  });
}

export function reportUiError(component: string, action: string, error: any, context?: Record<string, any>) {
  if (!reporter) return;
  reporter.report({
    type: 'ui-error',
    component,
    action,
    error: {
      name: error?.name,
      message: error?.message,
      stack: error?.stack
    },
    context
  });
}

export function flushAppErrorReports() {
  if (!reporter) return;
  reporter.flushQueue();
}

export function getAppErrorReportQueueSize() {
  if (!reporter) return 0;
  return reporter.getQueueSize();
}
```

### 2. Create Configuration System

Create `/src/lib/config/errorReporting.js`:

```javascript
/**
 * Error Reporting Configuration for [App Name] Demo
 */

import { browser } from '$app/environment';

/**
 * Get the local demo server error reporting endpoint
 */
function getLocalDemoEndpoint() {
  if (!browser) return null;
  const { protocol, hostname, port } = window.location;
  return `${protocol}//${hostname}:${port}/dev/error-reports`;
}

/**
 * Check if a server endpoint is responding
 */
async function checkServerHealth(endpoint) {
  if (!endpoint) return false;
  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(2000) // 2 second timeout
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}

/**
 * Detect environment and available servers
 */
async function detectEnvironmentAndServers() {
  if (!browser) {
    return {
      environment: 'server',
      useLocalDemo: false,
      fallbackDisabled: true
    };
  }
  
  const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const environment = isDev ? 'development' : 'production';
  
  // Check local demo server (current dev server)
  const localDemoEndpoint = getLocalDemoEndpoint();
  const useLocalDemo = localDemoEndpoint && await checkServerHealth(localDemoEndpoint);
  
  return {
    environment,
    useLocalDemo,
    fallbackDisabled: !useLocalDemo
  };
}

/**
 * Get error reporting configuration with smart server detection
 */
export async function getAppErrorReportingConfig() {
  const { environment, useLocalDemo, fallbackDisabled } = await detectEnvironmentAndServers();
  const isDev = environment === 'development';
  
  let endpoint;
  let serverType;
  
  if (isDev && useLocalDemo) {
    endpoint = getLocalDemoEndpoint();
    serverType = 'Local Demo Server (/dev/error-reports)';
  } else {
    // Production frontend error reporting not implemented yet
    endpoint = null;
    serverType = fallbackDisabled ? 'Disabled (no local servers available)' : 'Disabled (dev-only feature)';
  }
  
  return {
    enabled: !!endpoint,
    endpoint,
    debug: isDev,
    maxRetries: 3,
    retryDelay: 1000,
    environment,
    serverType,
    appName: '[app-name]', // Replace with your app name
    appVersion: '1.0.0'
  };
}

/**
 * Initialize error reporting for [app name] demo
 */
export async function initializeAppErrorReporting() {
  if (!browser) return false;
  
  try {
    const { initializeAppErrorReporter } = await import('../utils/errorReporter.js');
    const config = await getAppErrorReportingConfig();
    
    await initializeAppErrorReporter(config);
    
    console.log('[App Name] Error reporting initialized:', {
      endpoint: config.endpoint,
      serverType: config.serverType,
      enabled: config.enabled
    });
    
    return true;
  } catch (error) {
    console.error('[App Name] Failed to initialize error reporting:', error);
    return false;
  }
}

/**
 * Enable global error reporting for unhandled errors
 */
export function enableGlobalAppErrorReporting() {
  if (!browser) return;
  
  // Global error handler
  window.addEventListener('error', async (event) => {
    console.error('[App Name] Unhandled error:', event.error);
    
    try {
      const { reportAppError } = await import('../utils/errorReporter.js');
      await reportAppError('ui-interaction', event.error, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        type: 'uncaught-error'
      });
    } catch (reportingError) {
      console.error('[App Name] Failed to report uncaught error:', reportingError);
    }
  });
  
  // Unhandled promise rejection handler
  window.addEventListener('unhandledrejection', async (event) => {
    console.error('[App Name] Unhandled promise rejection:', event.reason);
    
    try {
      const { reportAppError } = await import('../utils/errorReporter.js');
      await reportAppError('api-call', event.reason, {
        type: 'unhandled-promise-rejection'
      });
    } catch (reportingError) {
      console.error('[App Name] Failed to report promise rejection:', reportingError);
    }
  });
}

/**
 * Report app-related errors
 */
export async function reportAppFlowError(operation, error, context = {}) {
  if (!browser) return;
  
  try {
    const { reportAppError } = await import('../utils/errorReporter.js');
    await reportAppError(operation, error, {
      appDemo: true,
      ...context
    });
  } catch (reportingError) {
    console.error('[App Name] Failed to report app error:', reportingError);
  }
}

/**
 * Report database/API errors
 */
export async function reportDatabaseError(table, operation, error, context = {}) {
  if (!browser) return;
  
  try {
    const { reportDataError } = await import('../utils/errorReporter.js');
    await reportDataError(table, operation, error, {
      database: true,
      ...context
    });
  } catch (reportingError) {
    console.error('[App Name] Failed to report database error:', reportingError);
  }
}

/**
 * Report UI component errors
 */
export async function reportComponentError(component, action, error, context = {}) {
  if (!browser) return;
  
  try {
    const { reportUiError } = await import('../utils/errorReporter.js');
    await reportUiError(component, action, error, {
      ui: true,
      ...context
    });
  } catch (reportingError) {
    console.error('[App Name] Failed to report UI error:', reportingError);
  }
}

/**
 * Flush any pending error reports
 */
export async function flushAppErrorReports() {
  if (!browser) return;
  
  try {
    const { flushAppErrorReports } = await import('../utils/errorReporter.js');
    await flushAppErrorReports();
  } catch (error) {
    console.error('[App Name] Failed to flush error reports:', error);
  }
}
```

### 3. Create Server Endpoint

Create `/src/routes/dev/error-reports/+server.js`:

```javascript
/**
 * Error reporting endpoint for the [app-name]-demo server
 * Logs error reports to console during development
 */

import { json } from '@sveltejs/kit';

export async function POST({ request }) {
	try {
		const errorReport = await request.json();
		
		// Log the error report with timestamp and formatting
		const timestamp = new Date().toISOString();
		const reportType = errorReport.type || 'unknown';
		
		console.log(`\n🚨 [${timestamp}] [App Name] Error Report - ${reportType.toUpperCase()}`);
		console.log('═'.repeat(70));
		
		// Format different types of error reports
		switch (errorReport.type) {
			case 'app-error':
				console.log(`🔧 App Error - ${errorReport.operation}`);
				if (errorReport.error) {
					console.log(`❌ Error: ${errorReport.error.message || errorReport.error}`);
					if (errorReport.error.name) console.log(`🏷️  Type: ${errorReport.error.name}`);
					if (errorReport.error.code) console.log(`🔢 Code: ${errorReport.error.code}`);
					if (errorReport.error.stack) console.log(`📚 Stack: ${errorReport.error.stack.split('\n')[0]}`);
				}
				break;
				
			case 'data-error':
				console.log(`🗄️  Database Error - ${errorReport.table}.${errorReport.operation}`);
				if (errorReport.error) {
					console.log(`❌ Error: ${errorReport.error.message || errorReport.error}`);
					if (errorReport.error.code) console.log(`🔢 Code: ${errorReport.error.code}`);
					if (errorReport.error.details) console.log(`📝 Details: ${errorReport.error.details}`);
					if (errorReport.error.hint) console.log(`💡 Hint: ${errorReport.error.hint}`);
				}
				console.log(`🏗️  Operation: ${errorReport.operation.toUpperCase()} on ${errorReport.table}`);
				break;
				
			case 'ui-error':
				console.log(`🎨 UI Error - ${errorReport.component}.${errorReport.action}`);
				if (errorReport.error) {
					console.log(`❌ Error: ${errorReport.error.message || errorReport.error}`);
					if (errorReport.error.name) console.log(`🏷️  Type: ${errorReport.error.name}`);
					if (errorReport.error.stack) console.log(`📚 Stack: ${errorReport.error.stack.split('\n')[0]}`);
				}
				console.log(`🧩 Component: ${errorReport.component}`);
				console.log(`⚡ Action: ${errorReport.action}`);
				break;
				
			default:
				console.log(`📋 Unknown Report Type:`, errorReport);
		}
		
		// Log context if available
		if (errorReport.context && Object.keys(errorReport.context).length > 0) {
			console.log(`🔍 Context:`, errorReport.context);
		}
		
		// Log technical details
		if (errorReport.userAgent) {
			const uaShort = errorReport.userAgent.includes('Chrome') ? 'Chrome' :
			               errorReport.userAgent.includes('Firefox') ? 'Firefox' :
			               errorReport.userAgent.includes('Safari') ? 'Safari' : 'Unknown';
			console.log(`🌐 Browser: ${uaShort}`);
		}
		if (errorReport.url) {
			console.log(`📍 URL: ${errorReport.url}`);
		}
		if (errorReport.app) {
			console.log(`📱 App: ${errorReport.app} v${errorReport.version || '1.0.0'}`);
		}
		
		console.log('═'.repeat(70));
		
		return json({ 
			success: true, 
			message: 'Error report logged successfully',
			timestamp,
			type: reportType
		});
		
	} catch (error) {
		console.error('❌ [Error Reporting] Failed to process error report:', error);
		
		return json({ 
			success: false, 
			message: 'Failed to process error report',
			error: error.message 
		}, { status: 500 });
	}
}

// GET endpoint for health check
export async function GET() {
	return json({
		status: 'healthy',
		service: '[app-name]-demo-error-reporting',
		timestamp: new Date().toISOString(),
		endpoints: {
			POST: 'Submit error reports',
			GET: 'Health check'
		}
	});
}
```

### 4. Initialize in Layout

Create or update `/src/routes/+layout.svelte`:

```svelte
<script lang="ts">
	import { onMount } from 'svelte';
	import '../app.pcss'; // or '../app.css' depending on your setup

	// Initialize error reporting on app startup
	onMount(async () => {
		try {
			const { initializeAppErrorReporting, enableGlobalAppErrorReporting } = 
				await import('../lib/config/errorReporting.js');
			
			await initializeAppErrorReporting();
			enableGlobalAppErrorReporting();
			
			console.log('[App Name] Application initialized with error reporting');
		} catch (error) {
			console.error('[App Name] Failed to initialize error reporting:', error);
		}
	});
</script>

<main>
	<slot />
</main>
```

### 5. Integrate with Data Operations

In your data stores or API utilities, add error reporting:

```typescript
import { reportDatabaseError } from '../config/errorReporting.js';

// Example: In a Supabase data operation
try {
  const { data, error } = await supabase
    .from('users')
    .select('*');
    
  if (error) {
    await reportDatabaseError('users', 'select', error, { context: 'loadUsers' });
    throw error;
  }
  
  return data;
} catch (err) {
  // Error is automatically reported above
  throw err;
}
```

### 6. Optional: Error Reporting Status Component

Create `/src/lib/components/ErrorReportingStatus.svelte`:

```svelte
<script lang="ts">
	import { onMount } from 'svelte';
	
	let config: any = null;
	let queueSize = 0;
	let lastRefresh = '';

	async function loadErrorReportingStatus() {
		try {
			const { getAppErrorReportingConfig } = await import('../config/errorReporting.js');
			const { getAppErrorReportQueueSize } = await import('../utils/errorReporter.js');
			
			config = await getAppErrorReportingConfig();
			queueSize = getAppErrorReportQueueSize();
			lastRefresh = new Date().toLocaleTimeString();
		} catch (error) {
			console.error('Failed to load error reporting status:', error);
		}
	}

	async function testErrorReporting() {
		try {
			const { reportAppFlowError } = await import('../config/errorReporting.js');
			await reportAppFlowError('ui-interaction', new Error('Test error from status component'), {
				test: true,
				timestamp: Date.now()
			});
			console.log('[App Name] Test error report sent');
		} catch (error) {
			console.error('Failed to send test error report:', error);
		}
	}

	onMount(() => {
		loadErrorReportingStatus();
		// Refresh status every 5 seconds
		const interval = setInterval(loadErrorReportingStatus, 5000);
		return () => clearInterval(interval);
	});
</script>

<div class="error-reporting-status">
	<h3>Error Reporting Status</h3>
	
	{#if config}
		<div class="status-grid">
			<div>Status: <span class={config.enabled ? 'enabled' : 'disabled'}>{config.enabled ? 'Enabled' : 'Disabled'}</span></div>
			<div>Environment: {config.environment}</div>
			<div>Server: {config.serverType}</div>
			<div>Queue: {queueSize} pending</div>
			<div>Debug: {config.debug ? 'On' : 'Off'}</div>
		</div>
		
		<div class="actions">
			<button on:click={loadErrorReportingStatus}>Refresh</button>
			{#if config.enabled}
				<button on:click={testErrorReporting}>Test Report</button>
			{/if}
		</div>
		
		{#if lastRefresh}
			<div class="last-updated">Last updated: {lastRefresh}</div>
		{/if}
	{:else}
		<div>Loading status...</div>
	{/if}
</div>

<style>
	.error-reporting-status {
		border: 1px solid #ddd;
		border-radius: 8px;
		padding: 1rem;
		margin: 1rem 0;
		font-size: 0.875rem;
	}
	
	.status-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.5rem;
		margin: 0.5rem 0;
	}
	
	.enabled {
		color: green;
		font-weight: bold;
	}
	
	.disabled {
		color: red;
		font-weight: bold;
	}
	
	.actions {
		display: flex;
		gap: 0.5rem;
		margin-top: 1rem;
	}
	
	.actions button {
		padding: 0.25rem 0.5rem;
		border: 1px solid #ccc;
		border-radius: 4px;
		background: white;
		cursor: pointer;
	}
	
	.last-updated {
		font-size: 0.75rem;
		color: #666;
		margin-top: 0.5rem;
	}
</style>
```

## Usage

### Manual Error Reporting

```javascript
import { reportAppFlowError, reportDatabaseError, reportComponentError } from '$lib/config/errorReporting.js';

// Report application operation errors
await reportAppFlowError('validation-error', error, { formData });

// Report database errors
await reportDatabaseError('users', 'insert', error, { user_id });

// Report UI component errors  
await reportComponentError('UserForm', 'submit', error, { form_data });
```

### Testing

1. **Launch your demo**: `pnpm run dev`
2. **Test health check**: `curl https://dev.thepia.net:5173/dev/error-reports`
3. **Send test error**: Use the status component or curl command
4. **Check console**: Error reports appear in terminal with rich formatting

## Key Benefits

- **Development-Only**: Error reporting only enabled in development environment
- **Smart Detection**: Automatic server availability detection with health checks  
- **Queue Management**: Pending reports queued when server unavailable
- **Retry Logic**: Failed reports automatically retried up to 3 times
- **Rich Console Output**: Formatted error reports with emojis and context
- **Global Error Capture**: Automatic capture of uncaught errors and promise rejections
- **Extensible**: Easy to add new error types and reporting scenarios

## Security Considerations

- Error reporting is automatically disabled in production environments
- No sensitive data should be included in error contexts
- API keys and credentials should never be logged
- The implementation is designed for development debugging only

## Customization

Replace the following placeholders throughout the implementation:

- `[App Name]` - Your application name (e.g., "Tasks App", "Admin Demo")
- `[app-name]` - Your app identifier (e.g., "tasks-app", "admin-demo")  
- Error types and operations as needed for your specific application
- Console formatting and emoji choices
- Additional context fields relevant to your app

This implementation provides a robust foundation for debugging and monitoring errors in Thepia demo applications during development.