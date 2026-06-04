# Service Worker-Driven Metadata Patching

## Overview

This document describes the Service Worker-driven metadata patching architecture that eliminates race conditions when updating user metadata from multiple browser tabs.

## Architecture

### Previous Approach (Client-Driven)
```
Client Tab 1: Fetch metadata → Merge consent → Send update
Client Tab 2: Fetch metadata → Merge consent → Send update (race condition!)
```

### New Approach (Service Worker-Driven)
```
Client Tab 1: Call flowsDB.patchMetadata(userId, patch, appCode, token)
                    ↓
Service Worker: Makes PATCH /metadata API request
                    ↓
Server: Atomically merges patch, returns updated metadata
                    ↓
Service Worker: Updates IndexedDB + broadcasts via BroadcastChannel
                    ↓
All Tabs: Receive update via BroadcastChannel listener
```

## Key Benefits

✅ **Single Writer Pattern** - Service Worker is the only writer to IndexedDB
✅ **Atomic Server-Side Merge** - Server handles fetch-merge-send atomically
✅ **Automatic Broadcasting** - All tabs notified instantly via BroadcastChannel
✅ **Offline Support** - Service Worker can queue requests for offline scenarios
✅ **Centralized Logic** - All metadata operations go through Service Worker
✅ **No Race Conditions** - IndexedDB transaction locking eliminated

## Implementation

### 1. New RPC Procedure

**File**: `src/types/procedures.ts`

```typescript
'auth.patchMetadata': {
  input: {
    userId: string;
    patch: Record<string, unknown>;
    appCode: string;
    token: string;
  };
  output: Record<string, unknown>;
};
```

### 2. Service Worker Handler

**File**: `src/service-worker/index-db.ts`

```typescript
export async function patchMetadata(
  userId: string,
  patch: Record<string, unknown>,
  appCode: string,
  token: string
): Promise<Record<string, unknown>> {
  // 1. Make API request to PATCH /metadata
  const response = await fetch(`/api/${appCode}/metadata`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ patch })
  });

  // 2. Parse response
  const data = await response.json();

  // 3. Update IndexedDB with new metadata
  await updateUserMetadata(userId, data.metadata);

  // 4. Broadcast to all tabs (automatic via updateUserMetadata)
  return data.metadata;
}
```

### 3. Client API

**File**: `src/lib/flows-client.ts`

```typescript
async patchMetadata(
  userId: string,
  patch: Record<string, unknown>,
  appCode: string,
  token: string
): Promise<Record<string, unknown>> {
  return await this.call('auth.patchMetadata', { userId, patch, appCode, token });
}
```

### 4. flows-auth Integration

**File**: `src/api/auth-api.ts`

The `confirmConsent` method now uses the Service Worker:

```typescript
async confirmConsent(request: ConfirmConsentRequest): Promise<ConfirmConsentResponse> {
  const flowsDB = getFlowsClient();
  
  // Get current session for user ID and token
  const session = await this.request('/auth/session', { method: 'GET' }, true);
  
  // Create patch payload
  const patch = {
    consent: {
      [request.url]: {
        v: request.v,
        dh: request.dh,
        ts: request.ts
      }
    }
  };
  
  // Use Service Worker to patch metadata
  const updatedMetadata = await flowsDB.patchMetadata(
    userId,
    patch,
    appCode,
    token
  );
  
  return { success: true, metadata: updatedMetadata };
}
```

## Multi-Tab Synchronization Flow

1. **Tab 1 confirms consent**
   - Calls `flowsDB.patchMetadata(userId, patch, appCode, token)`
   - Service Worker receives RPC call

2. **Service Worker makes API request**
   - Sends PATCH request to `/api/{appCode}/metadata`
   - Server atomically merges patch into metadata
   - Server returns updated metadata

3. **Service Worker updates IndexedDB**
   - Calls `updateUserMetadata(userId, metadata)`
   - Updates users table with new metadata
   - Broadcasts via BroadcastChannel

4. **All tabs receive update**
   - BroadcastChannel listener fires
   - Tabs update their local state
   - UI re-renders with new metadata

## Server-Side Implementation

### API Endpoint

**File**: `thepia.com/src/api/app/metadata.ts`

```
PATCH /{appCode}/metadata

Request:
{
  "patch": {
    "consent": {
      "https://example.com/terms": {
        "v": 1,
        "dh": "device-hash",
        "ts": 1697500000000
      }
    }
  }
}

Response:
{
  "success": true,
  "metadata": { ... }
}
```

### Auth0 & WorkOS PATCH Implementation

Both Auth0 and WorkOS support native partial updates via PATCH:

**Auth0** (`src/api/auth0.ts`):
```typescript
export async function patchUserMetadata(userId: string, patch: Record<string, unknown>): Promise<Record<string, unknown>> {
  // Wrap patch in app_metadata field for Auth0 API
  // (app_metadata is where our app stores all metadata)
  await auth0Client.updateUserMetadata(userId, {
    app_metadata: patch,
  });

  // Fetch and return updated metadata (app_metadata only)
  const updatedMetadata = await getUserMetadata(userId);
  return updatedMetadata;
}

export async function getUserMetadata(userId: string): Promise<Record<string, unknown> | null> {
  const user = await auth0Client.getUserById(userId);
  // Return only app_metadata - this is where our app stores all metadata
  // user_metadata is for Auth0's predefined fields (firstName, lastName, etc.)
  return user.app_metadata || null;
}
```

**WorkOS** (`src/api/workos.ts`):
```typescript
export async function patchUserMetadata(userId: string, patch: Record<string, unknown>): Promise<Record<string, unknown>> {
  // Send patch directly - WorkOS PATCH handles partial updates
  await updateUserMetadata(userId, patch);

  // Fetch and return updated metadata
  const updatedMetadata = await getUserMetadata(userId);
  return updatedMetadata;
}
```

Both providers handle partial updates natively:
- ✅ Only changed fields are sent
- ✅ Existing fields are preserved
- ✅ No client-side merge needed
- ✅ Simpler, more efficient code

**Key Distinction (Auth0 only):**
- **`app_metadata`** - Where our app stores all metadata (consent, preferences, invitations, etc.)
- **`user_metadata`** - Auth0's predefined fields (firstName, lastName, etc.) - not used by our app

## Advantages Over Previous Approach

| Aspect | Client-Driven | Service Worker-Driven |
|--------|---------------|----------------------|
| **Write Conflicts** | Possible (race conditions) | Impossible (single writer) |
| **Transaction Locking** | IndexedDB blocks concurrent writes | No blocking (SW is only writer) |
| **Offline Support** | Limited | Better (SW can queue) |
| **Code Complexity** | Spread across client + server | Centralized in SW |
| **Broadcasting** | Manual from client | Automatic from SW |
| **Error Handling** | Client responsible | SW handles retries |

## Testing

The implementation is tested through:
- Unit tests for `patchMetadata` RPC handler
- Integration tests for Service Worker API calls
- Multi-tab synchronization tests via BroadcastChannel
- Consent confirmation flow tests

## Future Enhancements

- **Offline Queue** - Queue metadata patches when offline, sync when online
- **Conflict Resolution** - Handle concurrent patches to same field
- **Patch Validation** - Validate patch structure before sending
- **Audit Logging** - Track all metadata changes with timestamps
- **Rollback Support** - Ability to revert metadata changes

