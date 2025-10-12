# Service Worker Testing Levels - Complete Guide

## Overview: Three Levels of Testing

This project now has **three distinct levels** of service worker testing, each serving a different purpose:

### Level 1: Bundle Content Validation ✅
**File**: `service-worker-bundle.test.ts`
**What it tests**: String content of the built bundle
**Fidelity**: Lowest (static analysis only)

### Level 2: Real Integration Testing ✅
**File**: `service-worker-integration.test.ts`
**What it tests**: Real source functions against real IndexedDB
**Fidelity**: Medium (real functions, polyfilled environment)

### Level 3: Bundle Execution Testing ✅ **[BEST]**
**File**: `service-worker-execution.test.ts`
**What it tests**: Actual service worker bundle execution
**Fidelity**: Highest (production bundle, simulated SW environment)

---

## Detailed Comparison

### Level 1: Bundle Content Validation

```typescript
// service-worker-bundle.test.ts
it('should contain seed data', async () => {
  const swPath = resolve(__dirname, '../dist/flows-sw.js');
  const content = await readFile(swPath, 'utf-8');

  expect(content).toContain('journey-001');
  expect(content).toContain('Sarah Chen');
});
```

**What it actually tests:**
- ✅ Bundle file exists
- ✅ Bundle contains expected strings
- ✅ Bundle has certain keywords

**What it DOESN'T test:**
- ❌ Whether the code actually runs
- ❌ Whether the logic is correct
- ❌ Whether RPC calls work
- ❌ Whether IndexedDB operations work
- ❌ Whether event handlers are registered

**Use case**: Quick smoke test after build to ensure bundle generated

**Performance**: ~5ms (just file reads)

---

### Level 2: Real Integration Testing

```typescript
// service-worker-integration.test.ts
import 'fake-indexeddb/auto';
import { saveAuthSession, getAuthSession } from '../src/service-worker/index-db.js';

it('should return expired session with refresh token', async () => {
  const expiredSession: SessionData = {
    userId: 'user-456',
    email: 'expired@example.com',
    accessToken: 'expired_token',
    refreshToken: 'valid_refresh_token',
    expiresAt: Date.now() - 3600000,
    refreshedAt: Date.now() - 3600000,
    authMethod: 'email-code',
  };

  // Use REAL function to save
  await saveAuthSession(expiredSession);

  // Use REAL function to retrieve
  const retrieved = await getAuthSession();

  // Verify REAL behavior
  expect(retrieved).not.toBeNull();
  expect(retrieved?.refreshToken).toBe('valid_refresh_token');
});
```

**What it actually tests:**
- ✅ Real source code functions
- ✅ Real IndexedDB operations (via polyfill)
- ✅ Real async behavior
- ✅ Real session persistence
- ✅ Real sorting and filtering logic

**What it DOESN'T test:**
- ❌ The built bundle (tests source files directly)
- ❌ Service worker message protocol
- ❌ Service worker lifecycle events
- ❌ RPC handler routing
- ❌ Build process correctness

**Use case**: TDD during development, testing individual functions

**Performance**: ~115ms (real IndexedDB operations)

**Advantages:**
- Tests real function logic
- No mocking of core functionality
- Fast feedback during development
- Easy to debug (source code, not minified)

**Disadvantages:**
- Doesn't test the production bundle
- Build errors could pass tests
- Doesn't test service worker environment

---

### Level 3: Bundle Execution Testing ⭐ **RECOMMENDED**

```typescript
// service-worker-execution.test.ts
import makeServiceWorkerEnv from 'service-worker-mock';
import 'fake-indexeddb/auto';

beforeEach(async () => {
  // Load ACTUAL production bundle
  const swPath = resolve(__dirname, '../dist/flows-sw.js');
  swCode = await readFile(swPath, 'utf-8');

  // Create service worker environment
  swEnv = makeServiceWorkerEnv();
  Object.assign(global, swEnv);
  (global as any).self = swEnv.self;

  // Execute the bundle
  eval(swCode);

  // Trigger lifecycle events
  await swEnv.trigger('install');
  await swEnv.trigger('activate');
});

it('should handle auth/saveSession RPC call', async () => {
  const session: SessionData = { /* ... */ };

  const messageEvent = new swEnv.ExtendableMessageEvent('message', {
    data: {
      type: 'RPC',
      procedure: 'auth',
      method: 'saveSession',
      input: session,
    },
    ports: [{
      postMessage: (response: any) => {
        expect(response.success).toBe(true);
      },
    }],
  });

  await swEnv.trigger('message', messageEvent);
});
```

**What it actually tests:**
- ✅ **The exact production bundle** that ships to browsers
- ✅ Service worker message protocol
- ✅ Service worker lifecycle (install, activate)
- ✅ RPC handler routing and dispatching
- ✅ Real IndexedDB operations (via polyfill)
- ✅ Bundle minification doesn't break code
- ✅ Build process produces working output

**What it DOESN'T test:**
- ❌ Actual browser rendering (use E2E for that)
- ❌ Real service worker registration (use E2E for that)
- ❌ Network request interception (not used in this SW)

**Use case**: Pre-deployment validation, CI/CD pipeline

**Performance**: ~26ms (includes bundle execution overhead)

**Advantages:**
- **Tests production code**, not source
- Catches build errors
- Validates minification/bundling
- Tests service worker protocol
- Tests RPC routing
- Tests lifecycle events
- **Highest confidence before deployment**

**Disadvantages:**
- Slightly slower than source testing
- Harder to debug (minified code)
- Requires build step first

---

## Evidence of Real Execution

When running Level 3 tests, you see **actual service worker logs**:

```
stdout | tests/service-worker-execution.test.ts
[SW] Flows Service Worker 1.0.0 loaded
[SW] Installing version 1.0.0
[SW] Activating version 1.0.0
```

This proves we're executing the **real production service worker**, not mocks!

---

## Test Coverage Summary

### service-worker-bundle.test.ts (Level 1)
**6 tests** - Static bundle validation
- Bundle exists
- Contains seed data
- Contains lifecycle handlers
- Contains IndexedDB operations
- Contains RPC handlers

### service-worker-integration.test.ts (Level 2)
**13 tests** - Real function integration
- 3 tests for seed data
- 8 tests for auth session operations
- 2 tests for session updates

### service-worker-execution.test.ts (Level 3) ⭐
**12 tests** - Production bundle execution
- 5 tests for auth RPC operations
- 2 tests for query RPC operations
- 2 tests for service worker lifecycle
- 3 tests for bundle content validation

---

## Recommended Testing Strategy

### During Development (TDD)
Use **Level 2** (integration tests):
```bash
pnpm test tests/service-worker-integration.test.ts --watch
```
- Fast feedback
- Tests real logic
- Easy to debug

### Before Committing
Run **Level 3** (execution tests):
```bash
pnpm build && pnpm test tests/service-worker-execution.test.ts
```
- Validates production bundle
- Catches build errors
- Ensures deployment readiness

### In CI/CD Pipeline
Run **all three levels**:
```bash
pnpm build
pnpm test tests/service-worker-bundle.test.ts      # Quick smoke test
pnpm test tests/service-worker-integration.test.ts # Logic validation
pnpm test tests/service-worker-execution.test.ts   # Production validation
```

### Before Production Deployment
**Level 3** is mandatory:
- Tests the exact code that will run in browsers
- Validates the entire build pipeline
- Provides highest confidence

---

## What About the Old Tests?

### service-worker-seed.test.ts (DEPRECATED)
**Status**: Should be deleted or replaced
**Problem**: Tests mocks, not real code
**Replacement**: service-worker-integration.test.ts (Level 2)

See `TEST_MIGRATION_NOTES.md` for details on why the old tests were problematic.

---

## Key Insight: Testing the Bundle vs Testing the Source

### Why Level 3 Matters

You could have:
- ✅ Perfect source code
- ✅ All Level 2 tests passing
- ❌ Build process introduces bug
- ❌ Production bundle doesn't work

**Level 3 catches this** because it tests the actual bundle.

### Real Example

Imagine your bundler:
- Minifies variable names incorrectly
- Breaks a critical RPC case statement
- Removes "dead code" that's actually needed

**Level 2 tests**: ✅ All pass (testing source)
**Level 3 tests**: ❌ Fail (testing broken bundle)

This is why testing the bundle is critical.

---

## Conclusion

For **maximum confidence in production**:

1. **Level 2** during development (fast iteration)
2. **Level 3** before deployment (production validation)
3. **Level 1** optional (quick smoke test)

The combination of Level 2 + Level 3 provides:
- Fast feedback during development
- Real function testing
- Production bundle validation
- Service worker protocol testing
- Complete confidence before deployment

**Level 3 is the closest you can get to production without a real browser.**
