# Local Flows Database Architecture

**📋 SCOPE**: This document covers local data storage in flows-client applications:
- **IndexedDB** - Browser-based local storage (web apps, PWAs, WebViews)
- **app-db.sqlite** - Native SQLite database (iOS/macOS apps via Blackbird)

**🎯 PHILOSOPHY**: Incremental changes reflecting current state, carefully planned to avoid IndexedDB overflow.

---

## Current State: IndexedDB (Browser/WebView)

### Database Configuration
- **Database Name**: `flows_db` (from INDEXEDDB_NAME constant)
- **Version**: Incremented on schema changes (from INDEXEDDB_VERSION)
- **Separate Logger DB**: `flows-tmp` for debug logging (non-critical)

### Object Stores (Current Implementation)

#### 1. **journeys** - Workflow/Process Data
```javascript
keyPath: 'id'
indexes:
  - client_id (non-unique)
  - status (non-unique)
  - created_at (non-unique)
```
**Purpose**: Store workflow instances (offboarding, onboarding, etc.)
**Fields**: id, client_id, status, created_at, updated_at, [workflow-specific data]

#### 2. **tasks** - Task Management
```javascript
keyPath: 'id'
indexes:
  - journey_id (non-unique)
  - status (non-unique)
  - assigned_to (non-unique)
```
**Purpose**: Individual tasks within journeys
**Fields**: id, journey_id, status, assigned_to, [task-specific data]

#### 3. **attachments** - File References
```javascript
keyPath: 'id'
indexes:
  - journey_id (non-unique)
  - task_id (non-unique)
```
**Purpose**: Document/file metadata (not file content)
**Fields**: id, journey_id, task_id, [attachment metadata]

#### 4. **comments** - Collaboration
```javascript
keyPath: 'id'
indexes:
  - journey_id (non-unique)
  - task_id (non-unique)
```
**Purpose**: Comments on journeys/tasks
**Fields**: id, journey_id, task_id, [comment data]

#### 5. **notes** - Internal Notes
```javascript
keyPath: 'id'
indexes:
  - journey_id (non-unique)
  - task_id (non-unique)
```
**Purpose**: Internal notes (not visible to external users)
**Fields**: id, journey_id, task_id, [note data]

#### 6. **evidence** - Supporting Documentation
```javascript
keyPath: 'id'
indexes:
  - journey_id (non-unique)
  - task_id (non-unique)
```
**Purpose**: Evidence/proof items for tasks
**Fields**: id, journey_id, task_id, [evidence data]

#### 7. **users** - User Profiles (Auth v2+)
```javascript
keyPath: 'userId'
indexes:
  - email (unique)
  - lastUsed (non-unique)
```
**Purpose**: Persistent user profiles (survive sign-out)
**Fields**: userId, email, name, avatar, emailVerified, createdAt, lastLoginAt, metadata, authMethod, lastUsed

#### 8. **auth_sessions** - Authentication Tokens (Auth v2+)
```javascript
keyPath: 'userId'
indexes:
  - expiresAt (non-unique)
  - createdAt (non-unique)
  - savedAt (non-unique)
```
**Purpose**: Temporary auth tokens (cleared on sign-out). Single session per user (overwrites on new login).
**Fields**: userId, email, createdAt (ISO string), accessToken, refreshToken, expiresAt (ISO string), refreshedAt (ISO string), authMethod, supabaseToken, supabaseExpiresAt (ISO string), savedAt (ISO string), metadata (JSON string, optional)

**Metadata Field** (New):
- **Type**: JSON string (serialized object)
- **Purpose**: Flexible storage for additional tokens and future extensions without schema changes
- **Format**: `{ [tokenName]: tokenValue, ... }` (flat object structure)
- **Example**: `{ "idToken": "eyJ...", "customToken": "abc..." }`
- **Storage**: Stored as JSON string in IndexedDB, parsed to object when retrieved
- **Extensibility**: Allows storing additional tokens (ID tokens, custom tokens, etc.) without modifying the schema

**Using Metadata for Future Tokens**:
When the API server returns additional tokens in the sign-in response:
1. Extract the tokens from the API response
2. Store them in the `metadata` object: `{ idToken: "...", customToken: "..." }`
3. Pass the metadata object to `saveAuthSession()` in flows-auth
4. The metadata is automatically serialized to JSON and stored in IndexedDB
5. When retrieving the session with `getAuthSession()`, metadata is automatically parsed back to an object
6. Access tokens via: `session.metadata.idToken`, `session.metadata.customToken`, etc.

This pattern allows the API server to return new token types without requiring schema migrations in flows-auth, flows-client, or thepia-app.

**⚠️ Note**: IndexedDB stores only the active session (single per user). Native stores multiple sessions with composite key `(userId, createdAt)`. When syncing from native to IndexedDB, only the active session should be synced.

#### 9. **sync_metadata** - Synchronization State
```javascript
keyPath: 'id'
```
**Purpose**: Track sync status between local and server
**Fields**: id, [sync tracking data]

---

## Current State: app-db.sqlite (Native Apps)

### Database Configuration
- **Location**: Documents directory (iCloud synced)
- **ORM**: Blackbird (Swift model persistence)
- **Initialization**: SQL files in `libs/record_thing/db/`
- **Auth Models**: Defined in `apps/libs/RecordLib/Sources/RecordLib/Model/FlowsAuthModels.swift`

### Auth Models (FlowsAuthModels.swift)

#### FlowsUser - User Profile (Persistent)
**Location**: `apps/libs/RecordLib/Sources/RecordLib/Model/FlowsAuthModels.swift`
**Blackbird Table**: `users`
**Primary Key**: `userId`

```swift
@BlackbirdColumn public var userId: String
@BlackbirdColumn public var email: String
@BlackbirdColumn public var name: String?
@BlackbirdColumn public var avatar: String?
@BlackbirdColumn public var emailVerified: Bool
@BlackbirdColumn public var createdAt: Date?
@BlackbirdColumn public var lastLoginAt: Date?
@BlackbirdColumn public var metadata: String? // JSON string
@BlackbirdColumn public var authMethod: String?
@BlackbirdColumn public var lastUsed: Date
```

**Purpose**: Persistent user profile (survives sign-out)
**Comparison to IndexedDB**:
| Field | IndexedDB users | FlowsUser (Native) | Notes |
|---|---|---|---|
| userId | ✅ keyPath | ✅ primaryKey | Unique identifier |
| email | ✅ unique index | ✅ field | User email |
| name | ✅ field | ✅ field | Display name |
| emailVerified | ✅ field | ✅ field | Email verification status |
| createdAt | ✅ field | ✅ field (Date) | Account creation timestamp |
| lastLoginAt | ✅ field | ✅ field (Date) | Last login timestamp |
| metadata | ✅ field | ✅ field (JSON string) | User metadata |
| authMethod | ✅ field | ✅ field | Auth provider (Auth0, WorkOS, etc.) |
| lastUsed | ✅ index | ✅ field (Date) | Last activity timestamp |

**Date Handling**: Uses Blackbird's native `Date` type for consistent timestamp handling. Blackbird automatically serializes/deserializes `Date` to SQLite's TEXT format (ISO 8601).

---

#### FlowsAuthSession - Authentication Tokens (Historical)
**Location**: `apps/libs/RecordLib/Sources/RecordLib/Model/FlowsAuthModels.swift`
**Blackbird Table**: `auth_sessions`
**Primary Key**: `userId + createdAt` (composite, allows historical sessions for debugging)

```swift
@BlackbirdColumn public var userId: String
@BlackbirdColumn public var createdAt: Date  // When session was created
@BlackbirdColumn public var email: String
@BlackbirdColumn public var accessToken: String
@BlackbirdColumn public var refreshToken: String?
@BlackbirdColumn public var expiresAt: Date?
@BlackbirdColumn public var refreshedAt: Date?
@BlackbirdColumn public var authMethod: String?
@BlackbirdColumn public var supabaseToken: String?
@BlackbirdColumn public var supabaseExpiresAt: Date?
@BlackbirdColumn public var savedAt: Date
@BlackbirdColumn public var metadata: String? // JSON string for additional tokens
```

**Metadata Field** (New):
- **Type**: `String?` (JSON serialized)
- **Purpose**: Flexible storage for additional tokens and future extensions without schema changes
- **Format**: JSON object as string, e.g., `{ "idToken": "...", "customToken": "..." }`
- **Serialization**: Blackbird stores as TEXT, parsed to/from JSON in handler code
- **Extensibility**: Allows storing ID tokens, custom tokens, or other token types without modifying the schema

**Using Metadata for Future Tokens**:
When the API server returns additional tokens in the sign-in response:
1. Extract the tokens from the API response
2. Store them in the `metadata` dictionary: `["idToken": "...", "customToken": "..."]`
3. Pass the metadata to `saveSession()` in NativeFlowsAuthHandler
4. The metadata is automatically serialized to JSON and stored in Blackbird
5. When retrieving the session with `getSession()`, metadata is automatically parsed back to a dictionary
6. Access tokens via: `session["metadata"]["idToken"]`, `session["metadata"]["customToken"]`, etc.

This pattern allows the API server to return new token types without requiring schema migrations in flows-auth, flows-client, or thepia-app.

**Purpose**: Store auth tokens for current session + historical sessions for debugging
- **Active Session**: Most recent session (used for API calls)
- **Historical Sessions**: Older sessions retained for debugging/audit trail
- **Cleared on Sign-Out**: Only active session cleared; history retained

**Comparison to IndexedDB**:
| Field | IndexedDB auth_sessions | FlowsAuthSession (Native) | Notes |
|---|---|---|---|
| userId | ✅ keyPath | ✅ part of composite key | User identifier |
| createdAt | ✅ index (ISO string) | ✅ part of composite key (Date) | Session creation timestamp |
| email | ✅ field | ✅ field | Email for reference |
| accessToken | ✅ field | ✅ field | JWT access token |
| refreshToken | ✅ field | ✅ field | Refresh token |
| expiresAt | ✅ field (ISO string) | ✅ field (Date) | Both use ISO strings at interface ✅ |
| refreshedAt | ✅ field (ISO string) | ✅ field (Date) | Both use ISO strings at interface ✅ |
| authMethod | ✅ field | ✅ field | Auth provider |
| supabaseToken | ✅ field | ✅ field | Supabase JWT |
| supabaseExpiresAt | ✅ field (ISO string) | ✅ field (Date) | Both use ISO strings at interface ✅ |
| savedAt | ✅ index (ISO string) | ✅ field (Date) | When session was saved |

**Date Handling** - Unified ISO String Approach:

**Design Principle**:
> "All timestamps passed through SessionData interface use ISO 8601 strings for portability across platforms (browser, native, cookies). Token refresh logic converts to milliseconds for comparison."

**IndexedDB** (Browser/WebView):
- **All timestamps**: **ISO 8601 strings**
  - `expiresAt`, `refreshedAt`, `supabaseExpiresAt`: ISO strings (from SessionData)
  - `createdAt`, `savedAt`: ISO strings
  - `lastUsed`, `lastLoginAt`: ISO strings
  - Type: `string` (ISO format)
  - Portable across all storage systems

**Native (Blackbird)**:
- **All timestamps**: `Date` type (Blackbird's native timestamp type)
  - `expiresAt`, `refreshedAt`, `supabaseExpiresAt`: `Date` (converted from ISO strings)
  - `createdAt`, `savedAt`: `Date`
  - `lastUsed`, `lastLoginAt`: `Date`
  - Blackbird handles serialization to SQLite

**Why ISO Strings?**:
- **Portability**: Works across all storage systems (IndexedDB, cookies, native SQLite)
- **No unit confusion**: ISO format is unambiguous (no milliseconds vs seconds debate)
- **Native compatibility**: Blackbird's `Date` type converts seamlessly from ISO strings
- **JSON serialization**: Cookies and localStorage serialize strings natively
- **Consistency**: All platforms use the same format at the interface boundary

**Token Refresh Logic** (in flows-auth):
- Receives ISO strings from `loadSession()`
- Converts to milliseconds for comparison: `new Date(expiresAt).getTime()`
- Compares with `Date.now()` (milliseconds)
- Converts back to ISO string before calling `saveSession()`

**Example Flow**:
```
flows-auth: Date.now() + expires_in * 1000 = 1732800000000 (milliseconds)
           → new Date(1732800000000).toISOString() = "2024-11-28T14:30:00.000Z"
           → saveSession({ expiresAt: "2024-11-28T14:30:00.000Z" })

IndexedDB: Stores "2024-11-28T14:30:00.000Z" (string)

Native:    Receives "2024-11-28T14:30:00.000Z"
           → Date(timeIntervalSince1970: ...) for Blackbird storage
           → Query: expiresAt > Date() (both Date objects)
```

**Session Storage**:
- **IndexedDB**: Single session per user (overwrites on new login)
- **Native**: Multiple sessions per user with composite key `(userId, createdAt)` for debugging/audit trail

**Benefits of Composite Key**:
- ✅ Allows multiple sessions per user (debugging, multi-device scenarios)
- ✅ Preserves session history for audit trail
- ✅ Can query all sessions for a user: `WHERE userId = ?`
- ✅ Can find active session: `WHERE userId = ? ORDER BY createdAt DESC LIMIT 1`
- ✅ Can clean up expired: `WHERE expiresAt < NOW()`

### Tables (Current Implementation)

#### 1. **accounts** - User Accounts
```sql
account_id TEXT PRIMARY KEY (KSUID)
name, username, email, sms, region
password_hash, team_id, avatar
is_active BOOLEAN
created_at, updated_at, last_login (Unix timestamps)
```
**Purpose**: User account data (comparable to flows-client user_roles + people)
**Note**: Single account per app instance

#### 2. **things** - Primary Records
```sql
id TEXT PRIMARY KEY (KSUID)
account_id, upc, asin, elid
brand, model, color, tags, category
evidence_type, evidence_type_name, title
[additional product/item fields]
```
**Purpose**: Main entities being tracked (products, items, etc.)

#### 3. **evidence** - Supporting Data
```sql
id TEXT PRIMARY KEY (KSUID)
thing_account_id, thing_id, request_id
strategist_account_id, strategist_id
created_at, updated_at (Unix timestamps)
evidence_type, data (JSON), local_file
```
**Purpose**: Evidence/proof items linked to things

#### 4. **universe** - Configuration/Metadata
```sql
id INTEGER PRIMARY KEY
url, name, description, version, date, checksum
is_downloaded, is_installed, is_running, is_paused, is_stopped
is_failed, is_completed, is_cancelled, is_deleted
enabled_menus, enabled_features, flags (JSON)
```
**Purpose**: App configuration and feature flags

#### 5. **product** - Product Database
```sql
id TEXT PRIMARY KEY (KSUID)
name, alt, alt1, alt2, brand_id, company_id
category, tags, wikidata_id, isni_id
description, launch_date, discontinued_date
official_url, support_url
```
**Purpose**: Reference product data

#### 6. **categories** - Taxonomy
- **product_type** - Product categories
- **document_type** - Document categories
- **evidence_type** - Evidence type definitions

#### 7. **assets** - Media Storage
- **clip_assets** - Video/media clips
- **image_assets** - Image metadata and storage

---

## Mapping: Native ↔ Flows-DB ↔ IndexedDB

### Auth Models (Unified Across All Platforms)

| Concept | Native (Blackbird) | IndexedDB (Browser) | Flows-DB (PostgreSQL) |
|---|---|---|---|
| **User Profile** | FlowsUser (users table) | users store | api.user_roles + api.people |
| **Auth Session** | FlowsAuthSession (auth_sessions table) | auth_sessions store | (implicit in JWT) |
| **Session PK** | ⚠️ userId (current) → userId + createdAt (proposed) | userId | N/A (stateless) |
| **Session History** | ✅ Proposed: retain for debugging | ❌ Cleared on sign-out | N/A |
| **Email** | ✅ field | ✅ index | ✅ field |
| **Metadata** | ✅ JSON string | ✅ field | ✅ JSONB |
| **Token Storage** | ✅ accessToken, refreshToken | ✅ accessToken, refreshToken | ❌ (stateless JWT) |
| **Timestamps** | Unix Double + ISO String | ISO String | TIMESTAMPTZ |

### Business Data (Workflow/Process)

| Native (app-db.sqlite) | Flows-DB (PostgreSQL) | IndexedDB (Browser) |
|---|---|---|
| things | journeys/tasks | journeys + tasks |
| evidence | evidence | evidence |
| universe | client_applications | (config only) |
| product | reference data | (not synced) |

### Key Architectural Differences

1. **Session Management**
   - ✅ Native: Explicit `auth_sessions` table (persisted to disk, stores historical sessions for debugging)
     - Current PK: `userId` (single session)
     - **Proposed PK**: `userId + createdAt` (multiple sessions, historical audit trail)
   - ✅ IndexedDB: Explicit `auth_sessions` store (cleared on sign-out, no history)
   - ❌ Flows-DB: Stateless (JWT only, no session table)

2. **User Identification**
   - Native: `userId` (String, from auth provider)
   - IndexedDB: `userId` (String, from auth provider)
   - Flows-DB: `thepia_user_id` (TEXT, stable identifier) + `supabase_user_id` (UUID, optional)

3. **Timestamp Formats**
   - Native: Unix timestamps (Double) for token expiry; ISO strings for user timestamps
   - IndexedDB: ISO strings or timestamps (implementation-dependent)
   - Flows-DB: TIMESTAMPTZ (PostgreSQL native)

4. **Metadata Storage**
   - Native: JSON string (serialized)
   - IndexedDB: JavaScript object (native)
   - Flows-DB: JSONB (PostgreSQL native)

---

## Incremental Implementation Plan

### Phase 1: Foundation (Current State Documentation)
- ✅ Document existing IndexedDB schema
- ✅ Document existing app-db.sqlite schema
- ✅ Map relationships between systems
- 📋 **Next**: Identify which tables need local caching

### Phase 2: Selective Caching (Planned)
- Determine which flows-client tables to cache locally
- Define field subsets (avoid full table replication)
- Implement sync strategy for each table
- Add conflict resolution logic

### Phase 3: Native Integration (Future)
- Extend app-db.sqlite with flows-client tables
- Implement bidirectional sync
- Add offline-first capabilities
- Handle multi-tab/multi-device scenarios

---

## Storage Constraints & Optimization

### IndexedDB Limits
- **Typical Quota**: 50MB per origin (varies by browser)
- **Strategy**: Store only essential fields, sync full data on demand
- **Cleanup**: Implement retention policies for old records

### SQLite Limits
- **Typical Quota**: Unlimited (device storage dependent)
- **Strategy**: Can store more data, but still optimize for performance
- **Cleanup**: Implement archival for old records

---

## Implementation Reference: FlowsAuthModels.swift

**File Location**: `/Volumes/Projects/Thepia/thepia-app/apps/libs/RecordLib/Sources/RecordLib/Model/FlowsAuthModels.swift`

This file defines the Blackbird models for native app auth storage. It's the **source of truth** for how auth data is persisted on iOS/macOS.

### Model Definitions

**FlowsUser** (lines 4-42)
- Blackbird table: `users`
- Primary key: `userId`
- Represents persistent user profile
- All fields optional except userId, email, emailVerified, lastUsed

**FlowsAuthSession** (lines 44-82)
- Blackbird table: `auth_sessions`
- **Primary Key**: `userId + createdAt` (composite, allows historical sessions for debugging)
- Represents auth tokens (current + historical for audit trail)
- Includes both Auth0/WorkOS tokens and Supabase tokens
- **Fields**: userId, createdAt, email, accessToken, refreshToken, expiresAt, refreshedAt, authMethod, supabaseToken, supabaseExpiresAt, savedAt

### Schema Changes for FlowsAuthSession (Implemented)

**Issue**: Single-session-per-user design prevented debugging and multi-device scenarios.

**Solution**: Composite primary key `(userId, createdAt)` to store session history.

**Changes Made**:

1. ✅ **Added `createdAt` field** to FlowsAuthSession
   ```swift
   @BlackbirdColumn public var createdAt: Date  // When session was created
   ```

2. ✅ **Updated Primary Key** (changed from `userId` only to composite)
   ```swift
   // Previous
   public static var primaryKey: [BlackbirdColumnKeyPath] = [\.$userId, \.$savedAt]

   // Current
   public static var primaryKey: [BlackbirdColumnKeyPath] = [\.$userId, \.$createdAt]
   ```

3. **Recommended Indexes for Queries**
   ```sql
   -- Find all sessions for a user
   CREATE INDEX idx_auth_sessions_user_id ON auth_sessions(userId);

   -- Find active session (most recent)
   CREATE INDEX idx_auth_sessions_user_created ON auth_sessions(userId, createdAt DESC);

   -- Clean up expired sessions
   CREATE INDEX idx_auth_sessions_expires ON auth_sessions(expiresAt);
   ```

4. **Session Lifecycle**
   - **Create**: New session on login → insert with `createdAt = now()`
   - **Active**: Query `WHERE userId = ? ORDER BY createdAt DESC LIMIT 1`
   - **Refresh**: Update tokens in active session (don't create new row)
   - **Sign-Out**: Delete active session only (keep history)
   - **Cleanup**: Periodically delete `WHERE expiresAt < now()`

5. **Fetching Active Session (Recommended Pattern)**

   **Problem with `ORDER BY savedAt DESC`**: `savedAt` is updated every time the session is refreshed, making it unreliable for finding the "active" session. The most relevant field is `expiresAt` (token expiration).

   **Recommended Query**:
   ```swift
   // Fetch active session: non-expired, most recently created
   let activeSession = try await FlowsAuthSession.read(
       from: db,
       sqlWhere: "userId = ? AND expiresAt > ? ORDER BY createdAt DESC LIMIT 1",
       userId,
       Date().timeIntervalSince1970  // Current Unix timestamp
   )
   ```

   **Why this approach**:
   - ✅ Excludes expired sessions (`expiresAt > now()`)
   - ✅ Finds most recently created session (`ORDER BY createdAt DESC`)
   - ✅ Handles token refresh correctly (doesn't create new rows, just updates tokens)
   - ✅ Automatically filters out old sessions from multi-device scenarios

   **Alternative: If you need the most recently saved session**:
   ```swift
   // Fetch most recently updated session (useful for debugging)
   let recentSession = try await FlowsAuthSession.read(
       from: db,
       sqlWhere: "userId = ? ORDER BY savedAt DESC LIMIT 1",
       userId
   )
   ```

   **Session Cleanup Query**:
   ```swift
   // Delete expired sessions (run periodically)
   try await FlowsAuthSession.query(
       in: db,
       "DELETE FROM auth_sessions WHERE expiresAt < ?",
       Date().timeIntervalSince1970
   )
   ```

### IndexedDB Session Operations

**File**: `src/service-worker/index-db.ts`

#### saveAuthSession(session: SessionData)
**Location**: Lines 558-612

**What it does**:
1. Saves to `users` table (persistent profile):
   - userId, email, name, emailVerified, metadata, authMethod
   - Updates `lastUsed` to current ISO timestamp
2. Saves to `auth_sessions` table (temporary tokens):
   - userId, email, createdAt, accessToken, refreshToken, expiresAt, refreshedAt, authMethod, supabaseToken, supabaseExpiresAt, savedAt
   - `createdAt` is set to current ISO timestamp (session creation time)
   - `savedAt` is set to current ISO timestamp (when session was saved)

**Important Notes**:
- ✅ Correctly stores `email` field (for reference without userId lookup)
- ✅ Correctly stores `createdAt` as ISO string (session creation timestamp, indexed for queries)
- ✅ Correctly stores `expiresAt` and `refreshedAt` as millisecond numbers (from SessionData)
- ✅ Correctly stores `savedAt` as ISO string (audit trail, indexed for queries)
- ⚠️ Single session per user (keyPath: 'userId' means new login overwrites previous session)

**Timestamp Handling**:
```typescript
const now = new Date().toISOString();  // ISO string for savedAt and createdAt
// expiresAt and refreshedAt come from SessionData as milliseconds
sessionsStore.put({
  createdAt: now,                      // ISO string (session creation)
  expiresAt: session.expiresAt,        // milliseconds (from SessionData)
  refreshedAt: session.refreshedAt,    // milliseconds (from SessionData)
  savedAt: now                         // ISO string (when saved)
});
```

#### getAuthSession(): Promise<SessionData | null>
**Location**: Lines 618-654

**What it does**:
1. Fetches all sessions from `auth_sessions` (typically just 1 due to keyPath: 'userId')
2. Sorts by `savedAt` (most recent first)
3. Returns the most recent session (regardless of expiry)
4. Logs expiry status for debugging

**Important Notes**:
- ✅ Correctly compares `expiresAt <= Date.now()` (both milliseconds)
- ✅ Returns expired sessions (lets auth store handle refresh logic)
- ✅ Correctly parses `savedAt` as ISO string for sorting
- ✅ Now has access to `createdAt` field for sync/debugging purposes
- ⚠️ `getAll()` is unnecessary (only 1 session per user), but harmless

**Timestamp Handling**:
```typescript
// Sorting by savedAt (ISO string)
sessions.sort((a: any, b: any) => {
  return new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime();
});

// Expiry check (milliseconds)
const isExpired = session.expiresAt <= Date.now();

// createdAt now available for sync/debugging
console.log('Session created at:', session.createdAt);
```

### Synchronization Strategy

When syncing between platforms:

1. **Native → IndexedDB**: Convert Blackbird models to IndexedDB format
   - String timestamps → ISO strings or Unix timestamps (standardize)
   - JSON strings → JavaScript objects
   - Preserve all fields
   - **Note**: IndexedDB only stores active session; native stores history

2. **IndexedDB → Native**: Convert IndexedDB records to Blackbird models
   - ISO strings → String format (native uses ISO)
   - JavaScript objects → JSON strings
   - Preserve all fields
   - **Note**: Only sync active session to IndexedDB

3. **Native ↔ Flows-DB**: No direct sync (flows-client is stateless)
   - Native stores tokens locally (with history)
   - Flows-DB validates tokens via JWT
   - User metadata synced via API calls

---

## Known Inconsistencies & Issues

### 1. **IndexedDB auth_sessions Primary Key Mismatch** ✅ DOCUMENTED
**Status**: Intentional architectural difference

**Current State**:
- IndexedDB: `keyPath: 'userId'` (single session, overwrites on new login)
- Native: `primaryKey: [userId, createdAt]` (multiple sessions for debugging)

**Rationale**:
- IndexedDB is for active session only (browser doesn't need history)
- Native stores full history for debugging/audit trail
- When syncing from native to IndexedDB, only the active session should be synced

**Resolution**: Documented in "Date Handling" section and comparison table.

---

### 2. **Timestamp Query Unit Mismatch in Native** 🔴 CRITICAL BUG
**Status**: IDENTIFIED - Native stores milliseconds but queries with Unix seconds

**Why Milliseconds?**:
- OAuth2 standard: API returns `expires_in` in **seconds**
- flows-auth converts to milliseconds: `Date.now() + expires_in * 1000` (line 198 in session.ts)
- IndexedDB stores milliseconds (from flows-auth)
- Native receives milliseconds from IndexedDB and stores them as-is
- Native must return milliseconds to flows-auth for consistency

**What Each Platform Actually Stores**:

| Field | IndexedDB | Native Storage | Native Query | Unit |
|-------|-----------|---|---|------|
| `expiresAt` | `session.expiresAt` | `expiresAt: Double` | `Date().timeIntervalSince1970` ❌ | **Milliseconds** stored, **seconds** queried |
| `refreshedAt` | `session.refreshedAt` | `refreshedAt: Double?` | `Date().timeIntervalSince1970` ❌ | **Milliseconds** stored, **seconds** queried |
| `supabaseExpiresAt` | `session.supabaseExpiresAt` | `supabaseExpiresAt: Double?` | `Date().timeIntervalSince1970` ❌ | **Milliseconds** stored, **seconds** queried |

**The Bug**:
- Native stores milliseconds correctly ✅ (line 55: `expiresAt: expiresAt`)
- Native queries using Unix seconds ❌ (line 79: `Date().timeIntervalSince1970`)

**The Problem**:
```swift
// Stored in SQLite: expiresAt = 1732800000000 (milliseconds)
// Query: SELECT * WHERE expiresAt > 1732800000 (Unix seconds)
// Comparison: 1732800000000 > 1732800000 → Always TRUE
// Result: getSession() returns nil (no active sessions found)
```

**Impact**:
- getSession() always returns nil
- Native apps can't load any sessions
- Token refresh completely broken

**Fix Required**:
- Update NativeFlowsAuthHandler.swift line 79: `Date().timeIntervalSince1970 * 1000` (convert to milliseconds)

---

### 3. **IndexedDB Timestamp Format Inconsistency** ✅ RESOLVED
**Status**: Intentional mixed approach - matches flows-auth design

**Source of Truth**: flows-auth/src/types/database.ts and flows-auth/src/types/index.ts

**Design Principle** (from flows-auth):
> "Uses numeric timestamps for expiration (timezone-independent), uses ISO string dates for user-facing fields (timezone-aware)"

**Current Implementation**:
- **Expiry timestamps** (`expiresAt`, `refreshedAt`, `supabaseExpiresAt`): **Millisecond numbers** (from SessionData)
  - Type: `number` (milliseconds since epoch)
  - Used for: Fast numeric comparison (`expiresAt <= Date.now()`)
  - Timezone-independent

- **Audit timestamps** (`createdAt`, `savedAt`): **ISO 8601 strings**
  - Type: `string` (ISO format)
  - Used for: Human-readable timestamps, sorting, debugging
  - Timezone-aware

- **User timestamps** (`lastUsed`, `lastLoginAt`): **ISO 8601 strings**
  - Type: `string` (ISO format)
  - Used for: User profile tracking

**Why This Design**:
- Expiry fields use numbers for performance (no conversion overhead in comparisons)
- Audit/user fields use ISO strings for readability and timezone awareness
- Matches flows-auth's explicit design principle

**Resolution**: Documented in "Date Handling" section with clear explanation and source reference.

---

### 4. **IndexedDB auth_sessions Missing `createdAt` Field** ✅ FIXED
**Status**: Implemented - `createdAt` now stored in IndexedDB

**Changes Made**:
1. ✅ Added `createdAt` index to schema (line 79 in index-db.ts)
2. ✅ Added `createdAt` field to saveAuthSession (line 598 in index-db.ts)
3. ✅ Set to current ISO timestamp when session is created
4. ✅ Updated documentation to reflect new field

**Benefits**:
- ✅ Consistency with native FlowsAuthSession
- ✅ Available for future multi-device sync logic
- ✅ Enables debugging/audit trail queries
- ✅ Indexed for efficient queries

**Implementation**:
```typescript
// In saveAuthSession
sessionsStore.put({
  createdAt: new Date().toISOString(),  // Session creation timestamp
  // ... other fields
});
```

---

### 5. **Outdated Schema Changes Section** ✅ FIXED
**Status**: Updated to reflect current implementation

**What was fixed**:
- Line 413: `createdAt: String` → `createdAt: Date`
- Updated code snippet to show current `Date` type
- Removed outdated "Proposed" markers

**Current Code** (FlowsAuthModels.swift):
```swift
@BlackbirdColumn public var createdAt: Date  // When session was created
@BlackbirdColumn public var expiresAt: Double  // Unix seconds for fast comparison
@BlackbirdColumn public var refreshedAt: Double?  // Unix seconds
@BlackbirdColumn public var supabaseExpiresAt: Double?  // Unix seconds
@BlackbirdColumn public var savedAt: Date  // When session was saved
```

**Resolution**: Schema changes section now accurately reflects implementation with correct types.

---

## Related Documentation
- **[DATABASE_ARCHITECTURE.md](DATABASE_ARCHITECTURE.md)** - Server-side flows-client schema
- **[NATIVE_APP_STATE_NOTIFICATION_PLAN.md](NATIVE_APP_STATE_NOTIFICATION_PLAN.md)** - Native app integration
- **[SESSION_MANAGEMENT_REQUIREMENTS.md](SESSION_MANAGEMENT_REQUIREMENTS.md)** - Auth session handling
- **FlowsAuthModels.swift** - Native Blackbird model definitions (source of truth for native storage)

---

**Document Status**: 📝 Current - Reflects actual implementation as of January 2025
**Last Updated**: January 2025
**Next Review**: When implementing Phase 2 (Selective Caching)
**Source Files Referenced**:
- `src/service-worker/index-db.ts` - IndexedDB implementation
- `apps/libs/RecordLib/Sources/RecordLib/Model/FlowsAuthModels.swift` - Native models
- `docs/DATABASE_ARCHITECTURE.md` - Server schema

