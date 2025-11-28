# App Message Protocol Specification

**Status**: Active
**Version**: 1.0.0
**Last Updated**: 2025-11-26

## Overview

Single unified message protocol for all Thepia app communication. Works across:
- **Native apps** (iOS/macOS) via WebKit message handlers
- **Web browsers** via Service Worker + MessageChannel

All messages route through a single handler: `window.__thepiaResponseHandler`

## 1. Message Format

### Request (Web → Native/ServiceWorker)

```typescript
{
  type: 'auth' | 'flowsdb',
  procedure: string,           // e.g., 'auth.saveSession', 'query.tasks'
  payload: any,                // Request data
  requestId: string            // Unique identifier for response matching
}
```

### Response (Native/ServiceWorker → Web)

```typescript
{
  requestId: string,           // Matches request
  type: 'auth' | 'flowsdb',   // Message type
  success: boolean,
  payload?: any,               // Response data (if success)
  error?: string               // Error message (if !success)
}
```

### State Notification (Web → Native, Fire-and-Forget)

```typescript
{
  type: 'flowsdb',
  procedure: 'webapp_state',
  payload: {
    readiness?: 'loading' | 'ready' | 'transitioning' | 'transitioned' | 'completed',
    pageHeight?: 'pill' | 'sheet' | 'full',
    backgroundMaterial?: 'clear' | 'thinMaterial' | 'ultraThinMaterial' | 'regularMaterial' | 'thickMaterial',
    currentStep?: string,
    stepList?: string[],
    backName?: string | null
  },
  requestId: string            // For tracking, no response expected
}
```

## 2. Message Types

All messages use the format above. This table lists all available procedures:

| Procedure | Type | Direction | Purpose | Payload |
|-----------|------|-----------|---------|---------|
| **auth.saveSession** | auth | Web → Native/SW | Store session data | `{ userId, email, name, accessToken, refreshToken, expiresAt, ... }` |
| **auth.getSession** | auth | Web → Native/SW | Retrieve current session | `undefined` |
| **auth.clearSession** | auth | Web → Native/SW | Remove all session data | `undefined` |
| **auth.saveUser** | auth | Web → Native/SW | Store user profile | `{ userId, email, name, avatar, emailVerified, metadata, ... }` |
| **auth.getUser** | auth | Web → Native/SW | Retrieve user profile | `userId` (string) |
| **auth.clearUser** | auth | Web → Native/SW | Remove user profile | `userId` (string) |
| **auth.updateUserMetadata** | auth | Web → Native/SW | Update user metadata (targeted) | `{ userId, metadata: {...} }` |
| **auth.patchMetadata** | auth | Web → Native/SW | Patch metadata via API + IndexedDB | `{ userId, patch: {...}, appCode, token }` |
| **query.journeys** | flowsdb | Web → Native/SW | Query all journeys | `{ filter?, orderBy?, limit? }` |
| **query.journeyById** | flowsdb | Web → Native/SW | Get single journey | `{ id }` |
| **query.tasks** | flowsdb | Web → Native/SW | Query all tasks | `{ filter?, orderBy?, limit? }` |
| **query.tasksByJourney** | flowsdb | Web → Native/SW | Get tasks for journey | `{ journeyId, orderBy?, limit? }` |
| **query.evidence** | flowsdb | Web → Native/SW | Query all evidence | `{ filter?, orderBy?, limit? }` |
| **query.evidenceByTask** | flowsdb | Web → Native/SW | Get evidence for task | `{ taskId, orderBy?, limit? }` |
| **mutation.insertJourney** | flowsdb | Web → Native/SW | Create journey | `{ data: {...} }` |
| **mutation.updateJourney** | flowsdb | Web → Native/SW | Update journey | `{ id, data: {...} }` |
| **mutation.deleteJourney** | flowsdb | Web → Native/SW | Delete journey | `{ id }` |
| **mutation.insertTask** | flowsdb | Web → Native/SW | Create task | `{ data: {...} }` |
| **mutation.updateTask** | flowsdb | Web → Native/SW | Update task | `{ id, data: {...} }` |
| **webapp_state** | flowsdb | Web → Native | Notify native app of UI state | `{ readiness?, pageHeight?, backgroundMaterial?, currentStep?, stepList?, backName? }` |

## 3. Implementation

### Auth Message Details

**auth.saveSession** - Store session with tokens and user info
```typescript
// Request payload
{
  userId: string,
  email: string,
  name?: string,
  accessToken: string,
  refreshToken: string,
  expiresAt: number,
  refreshedAt?: number,
  authMethod?: string,
  supabaseToken?: string,
  supabaseExpiresAt?: number,
  metadata?: Record<string, unknown>
}

// Response: SessionData (same structure)
```

**auth.getSession** - Retrieve current session
```typescript
// Request payload: undefined
// Response: SessionData | null
```

**auth.clearSession** - Remove all session tokens
```typescript
// Request payload: undefined
// Response: undefined
```

**auth.saveUser** - Store user profile
```typescript
// Request payload
{
  userId: string,
  email: string,
  name?: string,
  emailVerified?: boolean,
  createdAt?: string,
  lastLoginAt?: string,
  metadata?: Record<string, unknown>,
  authMethod?: string
}

// Response: undefined
```

**auth.getUser** - Retrieve user profile
```typescript
// Request payload: userId (string)
// Response: UserData | null
```

**auth.clearUser** - Remove user profile
```typescript
// Request payload: userId (string)
// Response: undefined
```

**auth.updateUserMetadata** - Targeted metadata update (local only)
```typescript
// Request payload
{
  userId: string,
  metadata: Record<string, unknown>
}

// Response: undefined
// Note: Merges with existing metadata, broadcasts to all tabs
```

**auth.patchMetadata** - Patch metadata via API with server-side merge
```typescript
// Request payload
{
  userId: string,
  patch: Record<string, unknown>,
  appCode: string,
  token: string  // Bearer token for API auth
}

// Response: Record<string, unknown> (updated metadata from server)
// Note: Makes API request, updates IndexedDB, broadcasts to all tabs
```

### Transport Implementation

**Native App (Swift)**:
```swift
// ThepiaMessageHandler.swift
func userContentController(_ userContentController: WKUserContentController,
                          didReceive message: WKScriptMessage) {
  guard let body = message.body as? [String: Any],
        let type = body["type"] as? String,
        let procedure = body["procedure"] as? String,
        let requestId = body["requestId"] as? String else {
    return
  }

  // Route by type
  switch type {
  case "auth":
    handleAuthMessage(procedure: procedure, payload: body["payload"], requestId: requestId)
  case "flowsdb":
    handleFlowsDBMessage(procedure: procedure, payload: body["payload"], requestId: requestId)
  default:
    sendResponse(requestId: requestId, type: type, success: false, error: "Unknown type")
  }
}

// Send response back to web
private func sendResponse(requestId: String, type: String, success: Bool, payload: Any? = nil, error: String? = nil) {
  let response: [String: Any] = [
    "requestId": requestId,
    "type": type,
    "success": success,
    "payload": payload ?? NSNull(),
    "error": error ?? NSNull()
  ]

  webView?.evaluateJavaScript(
    "window.__thepiaResponseHandler(\(jsonString(response)))"
  )
}
```

**Web App (flows-db)**:
```typescript
import { getFlowsDB, notifyNativeAppState } from '@thepia/flows-db';

// Use the client
const client = getFlowsDB();

// Save session
await client.session.saveSession({
  userId: 'user123',
  email: 'user@example.com',
  accessToken: 'token...',
  refreshToken: 'refresh...',
  expiresAt: Date.now() + 3600000
});

// Notify native app of state change
await notifyNativeAppState({ readiness: 'ready', pageHeight: 'full' });
```

## Error Handling

- **Timeout**: 10 seconds (configurable)
- **Fallback**: Browser context silently ignores native calls
- **Validation**: Always validate message structure and data types

## Related Documentation

### Native App Integration
- **Session Adapter** (flows-auth): `../flows-auth/docs/adapters/native-app-session-adapter.md` - Session persistence via WebKit
- **State Notifications**: `docs/NATIVE_APP_STATE_NOTIFICATION_PLAN.md` - UI state updates to native container

### Service Worker Integration
- **Communication Patterns**: `docs/client/SERVICE_WORKER_COMMUNICATION_PATTERNS.md` - MessageChannel, BroadcastChannel, lifecycle
- **Auth State Persistence**: `docs/client/SERVICE_WORKER_AUTH_STATE_PERSISTENCE.md` - IndexedDB storage patterns

### Implementation
- **Client**: `src/lib/flows-client.ts` - FlowsDBClient and NativeAppBridge
- **Service Worker**: `src/service-worker/flows-sw.ts` - Service worker entry point

