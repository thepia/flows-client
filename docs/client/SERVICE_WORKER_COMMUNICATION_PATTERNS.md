# Service Worker Communication Patterns

**Status**: Research & Planning
**Version**: 1.0.0
**Last Updated**: 2025-10-11

## Overview

This document outlines best practices for service worker registration, configuration, communication, and lifecycle management for Flows applications. It addresses three key challenges:

1. **Configuration Passing**: How to pass app-specific config to service workers
2. **Communication**: BroadcastChannel vs MessageChannel patterns
3. **Lifecycle Management**: Versioning, updates, and maintaining stable SW APIs

## Research Summary (October 2025)

### Key Findings

1. **BroadcastChannel vs MessageChannel**:
   - BroadcastChannel: One-to-many (all tabs/windows), simpler API, O(1) broadcast
   - MessageChannel: One-to-one, more complex, better for request/response patterns
   - Safari now supports BroadcastChannel (as of 2024)

2. **Configuration Passing**:
   - Service workers cannot access localStorage/sessionStorage
   - No native way to pass config at registration time
   - Best pattern: Use query parameters in SW URL or postMessage after registration

3. **Lifecycle Management**:
   - `skipWaiting()` forces immediate activation but can create version mismatches
   - Best practice: Prompt user for reload rather than force updates
   - Version SW files explicitly (sw-v1.js, sw-v2.js) or include version header

## Configuration Passing Patterns

### Pattern 1: Query Parameters in SW URL

**Recommended for static, site-wide configuration**

```typescript
// Registration in app (Astro, Svelte, etc.)
interface ServiceWorkerConfig {
  apiUrl: string;
  moduleCode: 'supabase' | 'firebase' | 'rest';
  schema?: string;
  version: string;
}

export async function registerFlowsServiceWorker(
  config: ServiceWorkerConfig
): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service workers not supported');
    return null;
  }

  try {
    // Encode config as URL search params
    const params = new URLSearchParams({
      apiUrl: config.apiUrl,
      moduleCode: config.moduleCode,
      schema: config.schema || 'api',
      version: config.version
    });

    // Register with config in URL
    const registration = await navigator.serviceWorker.register(
      `/flows-sw.js?${params.toString()}`,
      {
        scope: '/',
        type: 'module', // ES modules support
        updateViaCache: 'none' // Always check for updates
      }
    );

    console.log('✅ Service worker registered with config:', config);
    return registration;
  } catch (error) {
    console.error('❌ Service worker registration failed:', error);
    return null;
  }
}
```

**Service Worker side (flows-sw.js)**:

```typescript
// flows-sw.js
declare const self: ServiceWorkerGlobalScope;

// Parse config from URL at install time
const url = new URL(self.location.href);
const config = {
  apiUrl: url.searchParams.get('apiUrl') || '',
  moduleCode: url.searchParams.get('moduleCode') || 'supabase',
  schema: url.searchParams.get('schema') || 'api',
  version: url.searchParams.get('version') || '1.0.0'
};

console.log('🔧 Service worker config:', config);

// Store in cache for persistence across restarts
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('flows-config').then((cache) => {
      return cache.put(
        'config',
        new Response(JSON.stringify(config))
      );
    })
  );
});
```

**Pros**:
- Config available immediately during install
- Survives SW restarts
- Simple to implement

**Cons**:
- Config changes require SW re-registration
- Query params visible in DevTools (don't put secrets!)
- URL length limits (~2000 chars)

### Pattern 2: postMessage After Registration

**Recommended for dynamic or sensitive configuration**

```typescript
// Registration and config sending
export async function registerFlowsServiceWorker(
  config: ServiceWorkerConfig
): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;

  try {
    const registration = await navigator.serviceWorker.register('/flows-sw.js', {
      scope: '/',
      type: 'module',
      updateViaCache: 'none'
    });

    // Wait for SW to be ready
    await navigator.serviceWorker.ready;

    // Send config via postMessage
    if (registration.active) {
      registration.active.postMessage({
        type: 'INIT_CONFIG',
        config
      });
      console.log('✅ Config sent to service worker');
    } else {
      // SW is still installing, wait for it
      const sw = registration.installing || registration.waiting;
      if (sw) {
        await new Promise<void>((resolve) => {
          sw.addEventListener('statechange', function handler() {
            if (sw.state === 'activated') {
              sw.removeEventListener('statechange', handler);
              registration.active?.postMessage({
                type: 'INIT_CONFIG',
                config
              });
              resolve();
            }
          });
        });
      }
    }

    return registration;
  } catch (error) {
    console.error('❌ Service worker registration failed:', error);
    return null;
  }
}
```

**Service Worker side**:

```typescript
// flows-sw.js
let config: ServiceWorkerConfig | null = null;

self.addEventListener('message', async (event) => {
  const { type, config: newConfig } = event.data;

  if (type === 'INIT_CONFIG') {
    config = newConfig;

    // Store in cache
    const cache = await caches.open('flows-config');
    await cache.put('config', new Response(JSON.stringify(config)));

    console.log('🔧 Service worker config received:', config);

    // Acknowledge receipt
    event.ports[0]?.postMessage({ success: true });
  }
});

// Load config from cache on startup
self.addEventListener('activate', async (event) => {
  if (!config) {
    const cache = await caches.open('flows-config');
    const response = await cache.match('config');
    if (response) {
      config = await response.json();
      console.log('🔧 Service worker config loaded from cache:', config);
    }
  }
});
```

**Pros**:
- Can send sensitive data (still in memory, not in URL)
- Can update config without re-registering SW
- No URL length limits

**Cons**:
- More complex timing (need to wait for SW activation)
- Config not available during initial install event
- Requires cache persistence

### Pattern 3: Hybrid Approach (Recommended)

**Best of both worlds**: Use query params for non-sensitive static config, postMessage for dynamic/sensitive config.

```typescript
export interface StaticConfig {
  moduleCode: 'supabase' | 'firebase' | 'rest';
  version: string;
  scope: string;
}

export interface DynamicConfig {
  apiUrl: string;
  apiKey?: string; // Sensitive!
  jwt?: string; // Sensitive!
  schema?: string;
}

export async function registerFlowsServiceWorker(
  staticConfig: StaticConfig,
  dynamicConfig: DynamicConfig
): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;

  // Static config in URL
  const params = new URLSearchParams({
    moduleCode: staticConfig.moduleCode,
    version: staticConfig.version,
    scope: staticConfig.scope
  });

  const registration = await navigator.serviceWorker.register(
    `/flows-sw.js?${params.toString()}`,
    {
      scope: staticConfig.scope,
      type: 'module',
      updateViaCache: 'none'
    }
  );

  // Dynamic config via postMessage
  await navigator.serviceWorker.ready;
  registration.active?.postMessage({
    type: 'INIT_CONFIG',
    config: dynamicConfig
  });

  return registration;
}
```

## Communication Patterns

### BroadcastChannel: App State Sync Across Tabs

**Use case**: Synchronize data changes across multiple tabs/windows

```typescript
// In your app (works in Astro, Svelte, React, etc.)
export class FlowsDataBroadcaster {
  private channel: BroadcastChannel;

  constructor(channelName: string = 'flows-data-sync') {
    this.channel = new BroadcastChannel(channelName);

    // Listen for broadcasts from SW and other tabs
    this.channel.addEventListener('message', (event) => {
      this.handleBroadcast(event.data);
    });
  }

  // Broadcast data change to all tabs and SW
  broadcastDataChange(table: string, operation: string, data: any): void {
    this.channel.postMessage({
      type: 'DATA_CHANGE',
      table,
      operation, // 'insert', 'update', 'delete'
      data,
      timestamp: Date.now()
    });
  }

  private handleBroadcast(message: any): void {
    console.log('📡 Broadcast received:', message);

    // Update local state based on broadcast
    if (message.type === 'DATA_CHANGE') {
      // Trigger Svelte store update, React state update, etc.
      this.updateLocalData(message.table, message.data);
    }
  }

  private updateLocalData(table: string, data: any): void {
    // Implementation depends on framework
    // For Svelte: Update store
    // For React: Update state
  }

  close(): void {
    this.channel.close();
  }
}
```

**Service Worker side**:

```typescript
// flows-sw.js
const syncChannel = new BroadcastChannel('flows-data-sync');

// Listen for broadcasts from any tab
syncChannel.addEventListener('message', async (event) => {
  const { type, table, operation, data } = event.data;

  if (type === 'DATA_CHANGE') {
    console.log('📡 SW received data change broadcast:', table, operation);

    // Queue for background sync if offline
    if (!self.navigator.onLine) {
      await queueOperation({ table, operation, data });
    } else {
      // Sync immediately
      await syncToBackend({ table, operation, data });
    }
  }
});

// Broadcast from SW to all tabs when sync completes
async function notifySyncComplete(table: string, count: number): Promise<void> {
  syncChannel.postMessage({
    type: 'SYNC_COMPLETE',
    table,
    count,
    timestamp: Date.now()
  });
}
```

**Pros**:
- Simple API: one line to broadcast to everyone
- O(1) complexity (doesn't scale with number of tabs)
- Works across Service Worker + all tabs
- Perfect for state synchronization

**Cons**:
- No request/response pattern
- No acknowledgment/error handling
- Not suitable for sensitive data (all tabs receive)

### MessageChannel: Request/Response with SW

**Use case**: Direct communication with SW when you need a response

```typescript
// In your app
export async function queryServiceWorker<T>(
  type: string,
  payload?: any,
  timeout: number = 10000
): Promise<T> {
  if (!navigator.serviceWorker.controller) {
    throw new Error('Service worker not active');
  }

  return new Promise((resolve, reject) => {
    const messageChannel = new MessageChannel();

    // Setup timeout
    const timeoutId = setTimeout(() => {
      reject(new Error(`Service worker query timeout: ${type}`));
    }, timeout);

    // Listen for response on port1
    messageChannel.port1.onmessage = (event) => {
      clearTimeout(timeoutId);

      if (event.data.error) {
        reject(new Error(event.data.error));
      } else {
        resolve(event.data.result);
      }
    };

    // Send message with port2 for response
    navigator.serviceWorker.controller.postMessage(
      { type, payload },
      [messageChannel.port2]
    );
  });
}

// Example usage
const syncStatus = await queryServiceWorker<SyncStatus>('GET_SYNC_STATUS');
console.log('Sync status:', syncStatus);

const tasks = await queryServiceWorker<Task[]>('QUERY_TABLE', {
  table: 'tasks',
  filter: { status: 'pending' }
});
console.log('Tasks:', tasks);
```

**Service Worker side**:

```typescript
// flows-sw.js
self.addEventListener('message', async (event) => {
  const { type, payload } = event.data;
  const port = event.ports[0]; // MessageChannel port

  if (!port) {
    // No response port = broadcast message (ignore or use BroadcastChannel)
    return;
  }

  try {
    let result;

    switch (type) {
      case 'GET_SYNC_STATUS':
        result = await getSyncStatus();
        break;

      case 'QUERY_TABLE':
        result = await queryTable(payload.table, payload.filter);
        break;

      case 'INSERT_RECORD':
        result = await insertRecord(payload.table, payload.data);
        break;

      default:
        throw new Error(`Unknown message type: ${type}`);
    }

    // Send response back via port
    port.postMessage({ result });

  } catch (error) {
    // Send error back via port
    port.postMessage({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});
```

**Pros**:
- Request/response pattern
- Direct communication (lower latency)
- Error handling built-in
- Works in all browsers

**Cons**:
- More complex API (need to manage ports)
- Only one-to-one communication
- Need to setup for each request

### When to Use Which

| Pattern | Use Case | Example |
|---------|----------|---------|
| **BroadcastChannel** | State sync across tabs | Data changed in Tab A, Tab B auto-updates |
| **BroadcastChannel** | SW → All tabs notifications | "Sync complete", "Offline detected" |
| **MessageChannel** | Query SW for data | "What's the sync status?" |
| **MessageChannel** | Request SW to perform action | "Sync table X now" |
| **Both** | Complex flows | Use MessageChannel for commands, BroadcastChannel for events |

## Lifecycle Management & Versioning

### Version Control Pattern

```typescript
// flows-sw.js - Version at top of file
const SW_VERSION = '2.1.0';
const CACHE_PREFIX = 'flows';
const CACHE_NAME = `${CACHE_PREFIX}-v${SW_VERSION}`;

console.log(`🔧 Service Worker v${SW_VERSION} starting...`);

// Store version in cache for client access
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.put(
        'sw-version',
        new Response(JSON.stringify({ version: SW_VERSION }))
      );
    })
  );
});

// Clean up old caches on activation
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => {
            // Delete old version caches
            return name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME;
          })
          .map((name) => {
            console.log(`🗑️ Deleting old cache: ${name}`);
            return caches.delete(name);
          })
      );
    })
  );
});
```

### Update Detection & User Prompts

**Recommended pattern**: Detect updates, notify user, let them decide when to reload

```typescript
// In your app (Svelte component example)
<script lang="ts">
  import { onMount } from 'svelte';

  let updateAvailable = false;
  let registration: ServiceWorkerRegistration | null = null;

  onMount(async () => {
    if (!('serviceWorker' in navigator)) return;

    registration = await navigator.serviceWorker.ready;

    // Check for updates periodically
    setInterval(() => {
      registration?.update();
    }, 60 * 60 * 1000); // Check every hour

    // Listen for update found
    registration.addEventListener('updatefound', () => {
      const newWorker = registration!.installing;

      newWorker?.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          // New service worker available!
          updateAvailable = true;
        }
      });
    });
  });

  function applyUpdate() {
    if (!registration) return;

    // Tell new SW to skip waiting
    registration.waiting?.postMessage({ type: 'SKIP_WAITING' });

    // Reload page when SW takes over
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  }
</script>

{#if updateAvailable}
  <div class="update-banner">
    A new version is available!
    <button on:click={applyUpdate}>Update Now</button>
  </div>
{/if}
```

**Service Worker side - Handle SKIP_WAITING**:

```typescript
// flows-sw.js
self.addEventListener('message', (event) => {
  if (event.data.type === 'SKIP_WAITING') {
    console.log('⏭️ Skipping waiting phase');
    self.skipWaiting();
  }
});

// Immediately take control of all pages
self.addEventListener('activate', (event) => {
  event.waitUntil(
    self.clients.claim().then(() => {
      console.log('✅ Service worker now controls all pages');
    })
  );
});
```

### skipWaiting() Best Practices

**✅ DO**:
- Use `skipWaiting()` in response to user action (button click)
- Show clear UI indicating update is available
- Reload all tabs after skipWaiting to avoid version mismatch
- Test update flow in development

**❌ DON'T**:
- Call `skipWaiting()` automatically in install event
- Skip waiting without user consent
- Assume all tabs are on same SW version
- Forget to claim clients after activation

### Safe Update Pattern (Recommended)

```typescript
// App side - comprehensive update handling
export class ServiceWorkerUpdater {
  private registration: ServiceWorkerRegistration | null = null;
  private updateAvailable = false;
  private onUpdateCallback: (() => void) | null = null;

  async init(onUpdate?: () => void): Promise<void> {
    if (!('serviceWorker' in navigator)) return;

    this.onUpdateCallback = onUpdate || null;
    this.registration = await navigator.serviceWorker.ready;

    // Monitor for updates
    this.registration.addEventListener('updatefound', () => {
      this.handleUpdateFound();
    });

    // Check for updates on page focus
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.checkForUpdates();
      }
    });

    // Check for updates periodically
    setInterval(() => this.checkForUpdates(), 60 * 60 * 1000); // Hourly
  }

  private handleUpdateFound(): void {
    const newWorker = this.registration!.installing;
    if (!newWorker) return;

    newWorker.addEventListener('statechange', () => {
      if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
        this.updateAvailable = true;
        this.onUpdateCallback?.();
      }
    });
  }

  async checkForUpdates(): Promise<void> {
    try {
      await this.registration?.update();
    } catch (error) {
      console.error('Failed to check for updates:', error);
    }
  }

  async applyUpdate(): Promise<void> {
    if (!this.updateAvailable || !this.registration) return;

    // Tell SW to skip waiting
    this.registration.waiting?.postMessage({ type: 'SKIP_WAITING' });

    // Reload when new SW takes control
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;

        // Give SW time to finish activation
        setTimeout(() => {
          window.location.reload();
        }, 100);
      }
    });
  }

  isUpdateAvailable(): boolean {
    return this.updateAvailable;
  }
}
```

## Framework-Specific Integration

### Astro

```typescript
// src/pages/index.astro
---
// No server-side SW code
---

<html>
  <head>
    <title>My Flows App</title>
  </head>
  <body>
    <div id="app"></div>

    <script>
      import { registerFlowsServiceWorker } from '../lib/flows-sw-manager';

      // Register on page load (client-side only)
      if (typeof window !== 'undefined') {
        registerFlowsServiceWorker({
          apiUrl: import.meta.env.PUBLIC_SUPABASE_URL,
          moduleCode: 'supabase',
          schema: 'api',
          version: '1.0.0'
        });
      }
    </script>
  </body>
</html>
```

### Svelte/SvelteKit

```svelte
<!-- src/routes/+layout.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { registerFlowsServiceWorker } from '$lib/flows-sw-manager';
  import { env } from '$env/dynamic/public';

  let updateAvailable = false;

  onMount(async () => {
    if (!browser) return;

    const registration = await registerFlowsServiceWorker({
      apiUrl: env.PUBLIC_SUPABASE_URL,
      moduleCode: 'supabase',
      schema: 'api',
      version: '1.0.0'
    });

    if (registration) {
      // Setup update detection
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        newWorker?.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            updateAvailable = true;
          }
        });
      });
    }
  });

  function applyUpdate() {
    // Implementation from above
  }
</script>

{#if updateAvailable}
  <div class="update-banner">
    New version available!
    <button on:click={applyUpdate}>Update</button>
  </div>
{/if}

<slot />
```

## Testing Service Workers

### Development Testing

```typescript
// Enable SW logging
if (import.meta.env.DEV) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    console.log('🔄 Service worker controller changed');
  });

  navigator.serviceWorker.addEventListener('message', (event) => {
    console.log('📨 Message from SW:', event.data);
  });
}
```

### Testing in DevTools

1. **Chrome DevTools → Application → Service Workers**
   - View active workers
   - Unregister/update
   - Force update on reload
   - Bypass for network (disable SW temporarily)

2. **Test Update Flow**:
   ```
   1. Load page with SW v1
   2. Modify SW file (change version number)
   3. Click "Update" in DevTools or reload page
   4. Verify update banner appears
   5. Click "Update Now" button
   6. Verify page reloads with new SW
   ```

3. **Test Offline**:
   - DevTools → Network → Offline checkbox
   - Verify app still works
   - Check IndexedDB for cached data
   - Verify operations queue in IndexedDB

## API Stability Checklist

To maintain a stable service worker API:

- [ ] **Version all SW files explicitly** (`const SW_VERSION = '1.0.0'`)
- [ ] **Document message types** in TypeScript interfaces
- [ ] **Handle unknown message types gracefully** (don't crash on new messages)
- [ ] **Version message formats** (include version field in messages)
- [ ] **Backward compatible changes** (add fields, don't remove)
- [ ] **Test update flows** (v1 → v2 → v3)
- [ ] **Cache old configs** (for graceful migration)
- [ ] **Log SW version** in production (for debugging)
- [ ] **Monitor SW errors** (Sentry, etc.)
- [ ] **Plan for breaking changes** (migration guides)

## Recommended Architecture

```
flows-client/
├── src/
│   ├── service-worker/
│   │   ├── flows-sw.ts              # Main SW entry point
│   │   ├── version.ts               # SW_VERSION constant
│   │   ├── message-handlers.ts      # MessageChannel handlers
│   │   ├── broadcast-handlers.ts    # BroadcastChannel handlers
│   │   └── lifecycle.ts             # Install/activate/update logic
│   ├── client/
│   │   ├── sw-manager.ts            # Registration + config
│   │   ├── sw-broadcaster.ts        # BroadcastChannel wrapper
│   │   ├── sw-query.ts              # MessageChannel wrapper
│   │   └── sw-updater.ts            # Update detection + UI
│   └── types/
│       ├── sw-messages.ts           # Message type definitions
│       └── sw-config.ts             # Config interfaces
```

## Summary

**Configuration**: Use hybrid approach (query params for static + postMessage for dynamic)
**Communication**:
- BroadcastChannel for state sync across tabs (simple, O(1))
- MessageChannel for request/response with SW (direct, with acknowledgment)

**Lifecycle**:
- Version SW files explicitly
- Detect updates, prompt user (don't auto-skipWaiting)
- Reload all tabs after update
- Clean up old caches on activation

**Stability**:
- Version all message formats
- Handle unknown messages gracefully
- Test update flows thoroughly
- Monitor SW errors in production

## References

- [MDN: Using Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers)
- [MDN: BroadcastChannel API](https://developer.mozilla.org/en-US/docs/Web/API/Broadcast_Channel_API)
- [web.dev: Two-way communication with service workers](https://web.dev/articles/two-way-communication-guide)
- [web.dev: Service worker lifecycle](https://web.dev/articles/service-worker-lifecycle)
- [Chrome: Handling service worker updates](https://developer.chrome.com/docs/workbox/handling-service-worker-updates/)
