# Unit Tests

## Known Issues

### client-loading.test.js

**Status**: Partially failing (1/4 passing)

**Issue**: The Supabase mock chain doesn't fully replicate the complex query patterns used in `loadDemoData()`. The mock returns data correctly but the client store isn't being populated as expected.

**Root Cause**: The test mocks were written for an earlier version of the data loading logic. The current implementation has:
- More complex Supabase query chains (`.order()`, multiple `.eq()` calls)
- Conditional logic based on query results
- Multiple database calls with different response structures

**Passing Test**:
- ✅ "should use client ID parameter, not hardcoded client_code in loadClientSpecificData"

**Failing Tests**:
- ❌ "should load hygge-hvidlog as priority client without hardcoded override"
- ❌ "should load meridian-brands as second priority without fallback to nets-demo"
- ❌ "should respect localStorage client preferences"

**Fix Required**: Update mocks to match current `loadDemoData()` implementation or refactor `loadDemoData()` to be more testable (dependency injection).

## Other Tests

All other test suites are passing:
- ✅ FloatingStatusButton.test.ts
- ✅ client-persistence.test.ts
- ✅ applications-store.test.js
