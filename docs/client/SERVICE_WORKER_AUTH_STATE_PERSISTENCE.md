# Service Worker Auth State Persistence

## Analysis: flows-auth localStorage Patterns

### Current flows-auth Architecture

**Storage Layer** (`src/utils/storage.ts`):
```typescript
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'thepia_auth_access_token',
  REFRESH_TOKEN: 'thepia_auth_refresh_token',
  EXPIRES_AT: 'thepia_auth_expires_at',
  USER: 'thepia_auth_user',
  PREFERENCES: 'thepia_auth_preferences'
}

export const authStorage = {
  getAccessToken: () => getStorageItem(STORAGE_KEYS.ACCESS_TOKEN),
  setAccessToken: (token: string) => setStorageItem(STORAGE_KEYS.ACCESS_TOKEN, token),
  // ... more token/user methods
}
```

**Session Store** (`src/stores/core/session.ts`):
- Uses Zustand for state management
- Persists to sessionStorage/localStorage based on config
- Handles session validation and expiry
- Supports cross-tab sync via StorageEvent
- Session timeout: 8 hours default

**Key Patterns:**
1. **Direct localStorage access** - Simple key-value storage
2. **JSON serialization** - Complex objects stored as JSON strings
3. **Cross-tab sync** - Uses `window.addEventListener('storage')`
4. **Browser guards** - All storage wrapped in `isBrowser()` checks
5. **Error handling** - Try-catch on all storage operations

## Can flows-client Service Worker Support Auth State Persistence?

### Answer: Yes, with modifications

The service worker can provide **better** persistence than localStorage:

### Advantages of Service Worker Persistence

1. **IndexedDB is more powerful than localStorage**
   - No 5-10MB size limit (can store 100s of MBs)
   - Structured data storage (not just key-value)
   - Transactional operations
   - Better performance for large datasets

2. **Service Worker has broader scope**
   - Survives browser refreshes
   - Can sync in background
   - Works offline
   - Controls all network requests

3. **Better security model**
   - Data isolated per origin
   - Can encrypt sensitive data
   - Not accessible via XSS attacks on DOM

### Implementation Approach

#### Option 1: Add Auth Storage to Existing Service Worker (Recommended)

Add new procedures to `flows-client` RPC contract for service worker:

```typescript
// Add to src/types/procedures.ts
export interface AuthProcedures {
  'auth.saveSession': {
    input: {
      accessToken: string;
      refreshToken: string;
      expiresAt: number;
      user: User;
    };
    output: SessionData;
  };

  'auth.getSession': {
    input: void;
    output: {
      accessToken: string | null;
      refreshToken: string | null;
      expiresAt: number | null;
      user: User | null;
    };
  };

  'auth.clearSession': {
    input: void;
    output: void;
  };

  'auth.isSessionValid': {
    input: void;
    output: boolean;
  };
}
```

Add IndexedDB table in service worker:

```typescript
// In src/service-worker/index-db.ts
if (!db.objectStoreNames.contains('auth_sessions')) {
  const authStore = db.createObjectStore('auth_sessions', { keyPath: 'key' });
  authStore.createIndex('expiresAt', 'expiresAt', { unique: false });
}
```

Add RPC handlers:

```typescript
// In src/service-worker/index-db.ts
async function handleAuth(method: string, input: any): Promise<any> {
  switch (method) {
    case 'saveSession':
      return saveAuthSession(input);
    case 'getSession':
      return getAuthSession();
    case 'clearSession':
      return clearAuthSession();
    case 'isSessionValid':
      return isAuthSessionValid();
    default:
      throw new Error(`Unknown auth method: ${method}`);
  }
}
```

#### Option 2: Separate Auth Service Worker

Create a dedicated auth service worker in flows-auth:
- Handles only auth state
- Can be used alongside flows-client service worker
- More focused but requires multiple service workers

**Verdict**: Option 1 is better - single service worker manages all client-side state.

### Integration with flows-auth

**flows-auth** would add a storage adapter:

```typescript
// src/utils/storage-adapters/service-worker-adapter.ts
export class ServiceWorkerStorageAdapter {
  async getAccessToken(): Promise<string | null> {
    const session = await flowsDB.auth.getSession();
    return session.accessToken;
  }

  async setAccessToken(token: string): Promise<void> {
    const currentSession = await this.getSession();
    await flowsDB.auth.saveSession({
      ...currentSession,
      accessToken: token
    });
  }

  // ... more methods
}
```

Configure flows-auth to use service worker storage:

```typescript
// In app initialization
import { createAuthStore } from '@thepia/flows-auth';
import { ServiceWorkerStorageAdapter } from '@thepia/flows-auth/adapters';

const authStore = createAuthStore({
  apiBaseUrl: 'https://api.thepia.com',
  storageAdapter: new ServiceWorkerStorageAdapter(), // Use SW instead of localStorage
  enablePasskeys: true
});
```

### Benefits

1. **Unified storage** - All app state in one place (IndexedDB via service worker)
2. **Better offline support** - Service worker can manage auth state offline
3. **Cross-tab sync** - Built-in via service worker messaging
4. **Larger storage** - No localStorage size limits
5. **Better performance** - IndexedDB is faster for complex data
6. **Encryption support** - Can add encryption layer in service worker

### Challenges

1. **Migration complexity** - Need to migrate from localStorage to IndexedDB
2. **Service worker lifecycle** - Must handle service worker updates
3. **Debugging** - Service worker state harder to inspect than localStorage
4. **Browser support** - Service workers not available in all contexts (but neither is localStorage in some cases)

## Recommendation

**YES, implement auth state persistence in flows-client service worker.**

### Phase 1: Add Auth Storage to Service Worker
- Add `auth_sessions` table to IndexedDB schema
- Add RPC procedures for auth operations
- Implement session validation and expiry

### Phase 2: Create Storage Adapter in flows-auth
- Add `ServiceWorkerStorageAdapter` class
- Make storage layer pluggable
- Keep localStorage as default, SW as opt-in

### Phase 3: Migration Path
- Detect existing localStorage auth data
- Automatically migrate to service worker on first load
- Clean up old localStorage keys

### Phase 4: Enable by Default
- Once stable, make service worker storage the default
- localStorage becomes fallback for non-SW environments

## Next Steps

1. Document service worker auth procedures in `src/types/procedures.ts`
2. Implement IndexedDB schema for auth sessions
3. Add RPC handlers for auth operations
4. Create storage adapter in flows-auth
5. Write migration utility
6. Add tests for cross-tab sync
7. Document usage patterns

## Auth Provider Data Analysis (Auth0/WorkOS)

### Actual Data from SignIn Response

From thepia.com `src/api/types/responses.ts`:
```typescript
interface SignInResponse {
  user?: {
    id: string;              // Provider user ID (auth0|xyz)
    email: string;
    name?: string;
    emailVerified?: boolean;
    metadata?: Record<string, unknown>;
  };
  access_token?: string;     // JWT access token
  refresh_token?: string;    // Refresh token for renewals
  expires_in?: number;       // Seconds until expiration
  id_token?: string;         // Auth0 ID token
}
```

### Passkey Credential Storage

**Server-side only** (Auth0 `app_metadata.webauthn_credentials`):
- Credential ID (base64)
- Public key (base64)
- Signature counter
- Device type and transport info

**Client never receives raw credentials** - only user ID needed to reference server-stored credentials.

### Recommended Lean IndexedDB Schema

```typescript
// Table: auth_sessions (current session only)
interface AuthSession {
  userId: string;            // Primary key, from provider
  email: string;
  name?: string;
  emailVerified?: boolean;
  metadata?: Record<string, unknown>;  // Custom claims from Auth0/WorkOS

  accessToken: string;
  refreshToken: string;
  expiresAt: number;         // Millisecond timestamp

  authMethod: 'passkey' | 'email-code' | 'magic-link';
}

// Table: past_users (for email autofill)
interface PastUser {
  email: string;             // Primary key
  name?: string;
  userId: string;
  hasWebAuthn: boolean;
  lastSignInAt: number;
}
```

**Key decisions**:
1. No `lastActivity` - not provided by server, would require constant client updates
2. `userId` as primary key - natural identifier, guaranteed unique
3. No credential data - all passkey operations use server-side storage
4. `metadata` included - IndexedDB supports storing objects directly as field values

### Critical: Token Generation After Passkey Verification

**Auth0 Flow:**
1. Client verifies WebAuthn credential server-side (using `@simplewebauthn/server`)
2. Server calls Auth0 `/oauth/token` endpoint to get tokens:
   ```typescript
   POST https://{domain}/oauth/token
   {
     "grant_type": "urn:okta:params:oauth:grant-type:webauthn",
     "client_id": CLIENT_ID,
     "auth_session": sessionId,  // From challenge creation
     "authn_response": {         // WebAuthn response from browser
       "id": credentialId,
       "response": { signature, authenticatorData, ... }
     }
   }
   ```
3. Auth0 returns standard OAuth tokens:
   ```json
   {
     "access_token": "...",
     "refresh_token": "...",
     "id_token": "...",
     "expires_in": 86400
   }
   ```

**Documentation:**

- [Auth0 Native Passkeys API](https://auth0.com/docs/native-passkeys-api) (limited Early Access)
- [Auth0 Authentication API Reference](https://auth0.com/docs/api/authentication)
- [FIDO Authentication with WebAuthn](https://auth0.com/docs/secure/multi-factor-authentication/fido-authentication-with-webauthn)

**WorkOS Flow:**
- Passkeys currently **AuthKit-only** (no direct API)
- For custom UI with passkeys: Contact WorkOS support
- Alternative: Use Magic Auth (6-digit codes) with WorkOS API until passkey API available

**Documentation:**

- [WorkOS Passkeys](https://workos.com/docs/user-management/passkeys)
- [WorkOS AuthKit Reference](https://workos.com/docs/reference)
- [WorkOS User Management API](https://workos.com/docs/user-management)

### Current thepia.com Implementation Gap

The existing code in `src/api/auth/webauthn/register-verify.ts` and `verify.ts`:
- ✅ Verifies WebAuthn credentials correctly
- ✅ Stores/updates credentials in Auth0
- ❌ **Does NOT call `/oauth/token` to generate tokens**
- ❌ Returns success but no `access_token`/`refresh_token`

**Required Fix:** After successful WebAuthn verification, must call Auth0 `/oauth/token` endpoint with the WebAuthn grant type to obtain tokens for the session.

## Related Files

- flows-auth: `src/utils/storage.ts` - Current localStorage implementation
- flows-auth: `src/stores/core/session.ts` - Session management
- flows-client: `src/service-worker/index-db.ts` - IndexedDB operations
- flows-client: `src/types/procedures.ts` - RPC procedure definitions
- thepia.com: `src/api/types/responses.ts` - API response contracts
