# Core Architecture Contracts (ARCHIVED)

**⚠️ CONSOLIDATED**: This document has been merged into the comprehensive database architecture guide.

**📋 USE INSTEAD**: [../DATABASE_ARCHITECTURE.md](../DATABASE_ARCHITECTURE.md) - Complete database and system architecture

**🗓️ ARCHIVED**: January 2025 - API contracts consolidated into unified documentation

---

**Status**: Planning - Architecture Definition
**Version**: 1.0.0
**Last Updated**: 2025-10-11

## Purpose

Define the **minimal contracts** and **transport mechanisms** for flows-client architecture without prescribing implementation details. This document focuses on:

1. **What APIs are available** (browser vs native webview)
2. **Transport layer contracts** (how components communicate)
3. **Local DB responsibilities** (what it manages, not how)
4. **Component boundaries** (what glues together, not internals)

## Component Architecture

```
┌─────────────────────────────────────────┐
│         Application Layer               │
│    (Svelte, React, Vue, etc.)           │
│                                         │
│  - Business logic                       │
│  - UI rendering                         │
│  - User interactions                    │
└────────────┬────────────────────────────┘
             │
             │ Uses client API
             │
┌────────────▼────────────────────────────┐
│       Client Abstraction Layer          │
│                                         │
│  Contract: Unified API for data access  │
│  NOT specified: Caching, optimistic UI  │
└────────────┬────────────────────────────┘
             │
             │ Message passing
             │
        ┌────┴─────┐
        │          │
┌───────▼──────┐   ┌─────▼──────────┐
│   Browser    │   │    Native      │
│   Transport  │   │   Transport    │
└───────┬──────┘   └─────┬──────────┘
        │                │
┌───────▼──────┐   ┌─────▼──────────┐
│   Service    │   │   Native Code  │
│   Worker     │   │   (Swift/      │
│              │   │    Kotlin)     │
│   Manages:   │   │   Manages:     │
│   - IndexedDB│   │   - SQLite     │
│   - Cache    │   │   - Cache      │
│   - State    │   │   - State      │
│   - Remote   │   │   - Remote     │
│     conns    │   │     conns      │
└──────────────┘   └────────────────┘
```

## 1. Available APIs

### Browser Environment (Standard Web)

**Available**:
- ✅ Service Worker (fetch interception, background sync)
- ✅ IndexedDB (async key-value store)
- ✅ MessageChannel (1-to-1 communication)
- ✅ BroadcastChannel (1-to-many, cross-tab)
- ✅ postMessage (window/worker communication)
- ✅ fetch API (network requests)
- ✅ Cache API (HTTP response caching)

**Limitations**:
- Storage quota (~50-100MB typical)
- Background sync limited (must have tab open recently)
- No native DB access

### Native WebView Environment (iOS WKWebView / Android WebView)

**Available**:
- ✅ JavaScript execution
- ✅ fetch API (can be intercepted)
- ✅ localStorage / sessionStorage
- ✅ IndexedDB (polyfilled or native)
- ✅ Custom URL schemes (e.g., `flows://`)
- ✅ JavaScript ↔ Native bridge
- ⚠️ Service Worker (not available or limited)
- ❌ BroadcastChannel (not available)

**Native Capabilities**:
- ✅ SQLite database (unlimited storage)
- ✅ Network request interception
- ✅ True background processing
- ✅ Native push notifications
- ✅ Filesystem access

### Detection Strategy

```typescript
interface Environment {
  type: 'browser' | 'native-webview';
  capabilities: {
    serviceWorker: boolean;
    indexedDB: boolean;
    broadcastChannel: boolean;
    nativeBridge: boolean;
    sqliteAccess: boolean;
  };
}

function detectEnvironment(): Environment {
  // Native webview detection
  const hasNativeBridge = !!(
    (window as any).webkit?.messageHandlers ||
    (window as any).Android ||
    /NativeApp/i.test(navigator.userAgent)
  );

  if (hasNativeBridge) {
    return {
      type: 'native-webview',
      capabilities: {
        serviceWorker: false,
        indexedDB: true, // May be polyfilled
        broadcastChannel: false,
        nativeBridge: true,
        sqliteAccess: true
      }
    };
  }

  // Browser
  return {
    type: 'browser',
    capabilities: {
      serviceWorker: 'serviceWorker' in navigator,
      indexedDB: 'indexedDB' in window,
      broadcastChannel: 'BroadcastChannel' in window,
      nativeBridge: false,
      sqliteAccess: false
    }
  };
}
```

## 2. Transport Layer Contracts

### Transport Interface (Minimal Contract)

```typescript
/**
 * Transport layer contract - how client communicates with storage layer
 *
 * NOT specified:
 * - How messages are serialized
 * - Error handling strategies
 * - Retry logic
 * - Timeout handling
 */
interface Transport {
  /**
   * Send message, receive response
   *
   * @param message - Arbitrary message (implementation defines format)
   * @returns Promise resolving to response (implementation defines format)
   */
  send(message: unknown): Promise<unknown>;

  /**
   * Listen for broadcasts (optional, if environment supports)
   *
   * @param channel - Channel identifier
   * @param handler - Callback for messages on this channel
   * @returns Cleanup function
   */
  subscribe?(channel: string, handler: (message: unknown) => void): () => void;
}
```

### Browser Transport (via Service Worker)

**Available mechanisms**:
1. **MessageChannel** - Request/response pattern
2. **postMessage** - Fire-and-forget
3. **BroadcastChannel** - Cross-tab communication

**Contract**:
```typescript
interface BrowserTransport extends Transport {
  // Uses MessageChannel for send()
  // Uses BroadcastChannel for subscribe()

  // NOT specified:
  // - Message format
  // - Error serialization
  // - Timeout values
}
```

**Implementation hooks**:
- Service Worker: `self.addEventListener('message', ...)`
- Client: `navigator.serviceWorker.controller.postMessage(...)`

### Native Transport (via JavaScript Bridge)

**Available mechanisms**:
1. **iOS**: `webkit.messageHandlers.{name}.postMessage(...)`
2. **Android**: `window.{JavaInterface}.method(...)`
3. **Custom URL schemes**: Intercept `flows://` requests

**Contract**:
```typescript
interface NativeTransport extends Transport {
  // Uses native bridge for send()
  // Uses custom events for subscribe() (no BroadcastChannel)

  // NOT specified:
  // - Native method signatures
  // - Callback registration
  // - Event naming conventions
}
```

**Implementation hooks**:
- iOS: `WKScriptMessageHandler` receives messages
- Android: `@JavascriptInterface` methods
- Response: `webView.evaluateJavaScript(...)` to send back

## 3. Local DB Responsibilities

### What Local DB Manages

**Not implementation - just responsibilities**:

#### 1. Cache Management
- Cache remote API responses
- Determine cache freshness (implementation-defined)
- Invalidate stale cache (implementation-defined)

#### 2. Local State Persistence
- User preferences
- UI state (scroll positions, form data, etc.)
- Session data
- Offline queue (pending operations)

#### 3. Remote Connection State
- Database connection credentials (encrypted)
- Authentication tokens
- API endpoint configurations
- Connection pool state (if applicable)

#### 4. Sync Coordination
- Track last sync timestamp per entity
- Conflict resolution metadata
- Pending upload operations

**NOT responsibilities**:
- Business logic (belongs in application layer)
- UI rendering
- Network requests (handled by transport layer)

### Storage Boundaries

```typescript
/**
 * What gets stored locally
 * HOW it's stored is implementation-defined
 */
interface LocalStorageScope {
  // Cached data from remote
  cache: {
    // API response cache
    apiResponses: Record<string, CachedResponse>;

    // Query result cache
    queryCache: Record<string, unknown[]>;
  };

  // Local-only state
  state: {
    // User preferences
    preferences: Record<string, unknown>;

    // Session state
    session: {
      userId?: string;
      activeView?: string;
      [key: string]: unknown;
    };
  };

  // Remote connection info
  connections: {
    // Database connections (Supabase, Firebase, etc.)
    database?: DatabaseConnection;

    // API endpoints
    api?: APIConnection;
  };

  // Sync metadata
  sync: {
    lastSync: Record<string, Date>;
    pendingOps: Operation[];
    conflicts: Conflict[];
  };
}

// These are just type hints - actual storage format is implementation-defined
interface CachedResponse {
  data: unknown;
  expiresAt: Date;
  etag?: string;
}

interface DatabaseConnection {
  url: string;
  credentials: string; // Encrypted
  schema?: string;
}

interface Operation {
  id: string;
  type: 'insert' | 'update' | 'delete';
  entity: string;
  data: unknown;
  timestamp: Date;
}

interface Conflict {
  id: string;
  local: unknown;
  remote: unknown;
  timestamp: Date;
}
```

## 4. Message Passing Contracts

### Message Format (Suggested, Not Required)

```typescript
/**
 * Suggested message structure
 * Implementations may vary
 */
interface Message {
  // Required
  type: string;

  // Optional
  id?: string; // For request/response correlation
  payload?: unknown;
  timestamp?: number;
}

interface Response {
  // Required
  id: string; // Correlates with request

  // One of these
  result?: unknown;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}
```

### Browser Message Flow

```
Tab 1                    Service Worker              IndexedDB
  │                             │                        │
  │─────query('tasks')────────>│                        │
  │                             │                        │
  │                             │─────getAll('tasks')───>│
  │                             │<───────[tasks]─────────│
  │                             │                        │
  │<────[tasks]────────────────│                        │
  │                             │                        │
  │                             │───broadcast('tasks')──>│
  │                             │                   (to all tabs)
  │<────'tasks' updated─────────                        │
Tab 2<──'tasks' updated─────────                        │
```

### Native Message Flow

```
WebView                  Native Code                SQLite
  │                             │                        │
  │─────query('tasks')────────>│                        │
  │                             │                        │
  │                             │─────SELECT * FROM─────>│
  │                             │<───────rows────────────│
  │                             │                        │
  │<────[tasks]────────────────│                        │
  │                             │                        │
  │                             │──evaluateJS('update')─>│
  │<────task updated────────────                        │
```

## 5. Component Glue Points

### Glue Point 1: Client → Transport

**Contract**: Client uses transport without knowing implementation

```typescript
// Client code (same everywhere)
const transport = await createTransport(); // Factory handles detection
const result = await transport.send({ type: 'query', table: 'tasks' });

// Factory implementation (glue)
async function createTransport(): Promise<Transport> {
  const env = detectEnvironment();

  if (env.type === 'browser' && env.capabilities.serviceWorker) {
    return new ServiceWorkerTransport(
      await navigator.serviceWorker.ready
    );
  }

  if (env.type === 'native-webview' && env.capabilities.nativeBridge) {
    return new NativeBridgeTransport();
  }

  throw new Error('No compatible transport');
}
```

### Glue Point 2: Transport → Storage

**Contract**: Transport routes to appropriate storage implementation

```typescript
// Browser: Service Worker receives message
self.addEventListener('message', async (event) => {
  const { type, payload } = event.data;
  const port = event.ports[0];

  // Route to storage layer (implementation-defined)
  const result = await handleMessage(type, payload);

  port.postMessage({ result });
});

// Native: Bridge receives message
@objc func handleMessage(_ message: NSDictionary) {
  let type = message["type"] as! String
  let payload = message["payload"]

  // Route to storage layer (implementation-defined)
  let result = handleNativeMessage(type, payload)

  sendResponse(result)
}
```

### Glue Point 3: Storage → Remote

**Contract**: Local storage decides when/how to sync with remote

```typescript
// Browser Service Worker example
async function handleQuery(table: string, filter: unknown) {
  // Check local cache (implementation-defined)
  const cached = await checkCache(table, filter);
  if (cached && !isStale(cached)) {
    return cached.data;
  }

  // Fetch from remote (implementation-defined)
  if (navigator.onLine) {
    const remote = await fetchFromRemote(table, filter);
    await updateCache(table, filter, remote);
    return remote;
  }

  // Offline - return stale cache or error
  return cached?.data || { error: 'Offline' };
}

// Native code example
func handleQuery(table: String, filter: Any) -> Any {
  // Check SQLite cache (implementation-defined)
  if let cached = queryCache(table, filter), !isStale(cached) {
    return cached
  }

  // Fetch from remote (implementation-defined)
  if isOnline() {
    let remote = fetchFromRemote(table, filter)
    updateCache(table, filter, remote)
    return remote
  }

  // Offline - return stale or error
  return cached ?? ["error": "Offline"]
}
```

## 6. What Is NOT Specified

This document intentionally does **not** specify:

### Implementation Details
- ❌ How data is serialized (JSON, MessagePack, etc.)
- ❌ Cache invalidation strategies (TTL, LRU, etc.)
- ❌ Conflict resolution algorithms
- ❌ Retry logic and backoff timings
- ❌ Error handling patterns
- ❌ Logging/monitoring approaches

### Storage Details
- ❌ IndexedDB schema design
- ❌ SQLite table structures
- ❌ Index strategies
- ❌ Migration patterns

### Network Details
- ❌ API endpoint designs
- ❌ Authentication flows
- ❌ Batch operation strategies
- ❌ WebSocket vs polling

### UI/UX Details
- ❌ Loading indicators
- ❌ Error messages
- ❌ Optimistic UI updates
- ❌ Offline indicators

## 7. Extension Points

### Where Implementations Can Vary

```typescript
/**
 * Pluggable components - implementations decide details
 */
interface ExtensionPoints {
  // Cache strategy
  cacheStrategy?: {
    ttl?: number;
    maxSize?: number;
    evictionPolicy?: 'lru' | 'fifo' | 'lfu';
  };

  // Sync strategy
  syncStrategy?: {
    mode?: 'optimistic' | 'pessimistic';
    conflictResolution?: 'local-wins' | 'remote-wins' | 'manual';
    batchSize?: number;
  };

  // Network strategy
  networkStrategy?: {
    retries?: number;
    timeout?: number;
    fallback?: 'cache' | 'error';
  };

  // Storage backend
  storageBackend?: {
    type: 'indexeddb' | 'sqlite' | 'custom';
    config?: unknown;
  };
}
```

## Summary

### What This Document Defines

✅ **API availability** - What works in browser vs native
✅ **Transport contracts** - Minimal interface for communication
✅ **Component boundaries** - What each layer is responsible for
✅ **Glue points** - How components connect
✅ **Local DB scope** - What gets stored locally (not how)

### What This Document Leaves Open

⏸️ **Implementation details** - Each component decides internals
⏸️ **Optimization strategies** - Cache, sync, network strategies
⏸️ **Error handling** - Retry logic, fallbacks, user feedback
⏸️ **Storage format** - Schema design, indexing, migrations
⏸️ **UX patterns** - Loading states, optimistic updates, offline UX

### Key Principle

**"Define the contracts, not the implementations"**

Each component can evolve independently as long as it respects the contracts. The glue code handles environment detection and routing, but doesn't prescribe how each piece works internally.

## Related Documentation

- [SERVICE_WORKER_ARCHITECTURE.md](./SERVICE_WORKER_ARCHITECTURE.md) - Browser implementation example
- [NATIVE_SERVICE_WORKER_REPLACEMENT.md](./NATIVE_SERVICE_WORKER_REPLACEMENT.md) - Native implementation example
- [SERVICE_WORKER_RPC_INTERFACE.md](./SERVICE_WORKER_RPC_INTERFACE.md) - Typed API design (one possible approach)
- [CLIENT_STORAGE_ABSTRACTION.md](./CLIENT_STORAGE_ABSTRACTION.md) - Client layer features (one possible approach)
