# Integration Opportunities from app.thepia.net

## Overview
This document outlines uncommitted changes in `thepia-all/apps/app.thepia.net` that could be integrated into flows-client for improved developer experience and debugging capabilities.

## 1. Enhanced Store DevTools (`store-devtools-enhanced.ts`)

### Purpose
Advanced debugging tools for Svelte and Zustand stores with:
- Collapsible JSON tree view
- State history with time-travel debugging
- Diff view to see state changes
- Search/filter capabilities
- Optional Zod schema validation
- Luna JSON Editor integration

### Integration Value
- **For flows-client**: Could be used to debug Service Worker state and IndexedDB operations
- **For flows-auth**: Could help developers understand auth store state changes in real-time
- **For app developers**: Provides visual debugging without console logs

### Files to Extract
- `src/lib/dev/store-devtools-enhanced.ts` - Main devtools implementation
- `src/lib/dev/plugin-logger.ts` - Logging utility for devtools
- `src/lib/dev/README.md` - Documentation

### Implementation Steps
1. Copy devtools files to `flows-client/src/dev/`
2. Add Luna JSON Editor as optional dependency
3. Create integration guide for flows-auth consumers

---

## 2. Auth Store Schema (`auth-store-schema.ts`)

### Purpose
Zod schema for runtime validation of flows-auth store structure:
- User schema with metadata
- Token schema (access_token, refresh_token, expiresAt)
- Sign-in state machine states
- WebAuthn error types
- Complete AuthStore schema

### Integration Value
- **Type Safety**: Runtime validation of auth state
- **Documentation**: Schema serves as living documentation
- **Testing**: Can be used in test mocks
- **DevTools**: Works with store-devtools-enhanced for validation

### Key Schemas Defined
```typescript
- UserSchema
- TokensSchema
- SignInStateSchema
- WebAuthnErrorSchema
- SignInErrorSchema
- AuthCoreStateSchema
- SignInDataSchema
- ComposedAuthStoreSchema
```

### Integration Steps
1. Copy `auth-store-schema.ts` to `flows-client/src/schemas/`
2. Update to match flows-auth types exactly
3. Export from flows-client for consumer apps
4. Document usage in README

---

## 3. Workflow Store (`workflow-store.ts`)

### Purpose
Manages ongoing workflows and processes with:
- Process tracking (active, waiting, completed, error)
- Progress tracking (0-100)
- Workflow grouping
- Metadata support

### Integration Value
- **For flows-client**: Could track Service Worker operations
- **For flows-auth**: Could show sign-in flow progress
- **For app developers**: Provides UI-ready workflow state

### Key Features
- Add/remove processes
- Update process status and progress
- Group processes by workflow
- Clear completed processes

### Integration Steps
1. Copy `workflow-store.ts` to `flows-client/src/stores/`
2. Adapt for Service Worker operations
3. Create Svelte adapter for reactive updates
4. Document usage patterns

---

## 4. Token Field Naming Alignment

### Current Issue
- `app.thepia.net` uses `access_token` and `refresh_token` (snake_case)
- `flows-auth` uses `accessToken` and `refreshToken` (camelCase)

### Changes in app.thepia.net
```typescript
// Before (camelCase)
tokens.accessToken
tokens.refreshToken

// After (snake_case)
tokens.access_token
tokens.refresh_token
```

### Recommendation
- **Keep flows-auth camelCase**: Maintains consistency with TypeScript conventions
- **Update app.thepia.net**: Align with flows-auth types
- **Document in flows-client**: Clarify token field naming conventions

---

## 5. New UI Components

### OngoingCard.svelte
- Displays ongoing process status
- Shows progress bar
- Supports metadata display

### WelcomeCard.svelte
- Welcome/onboarding component
- Could be adapted for flows-client demo

### Integration Value
- Reusable UI patterns
- Could be moved to shared component library

---

## 6. Development Setup Page

### New Route: `src/routes/setup/+page.svelte`
- Setup workflow UI
- Could be adapted for flows-client configuration

---

## Priority Integration Roadmap

### Phase 1 (High Priority)
1. **Auth Store Schema** - Provides type safety and documentation
2. **Store DevTools Enhanced** - Improves developer experience

### Phase 2 (Medium Priority)
1. **Workflow Store** - Useful for tracking operations
2. **UI Components** - Reusable patterns

### Phase 3 (Low Priority)
1. **Setup Pages** - Nice-to-have for onboarding

---

## Implementation Notes

### Dependencies to Add
- `luna-json-editor` - For enhanced devtools
- `zod` - For schema validation (likely already present)

### Breaking Changes
- None expected - all integrations are additive

### Testing Requirements
- Validate schemas against actual auth store state
- Test devtools with both Svelte and Zustand stores
- Verify workflow store with Service Worker operations

---

## Next Steps

1. Review this document with team
2. Prioritize which integrations to implement
3. Create separate issues for each integration
4. Update flows-client documentation with new capabilities

