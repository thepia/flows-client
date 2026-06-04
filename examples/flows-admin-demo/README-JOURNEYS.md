# Journeys Demo - Service Worker Architecture

This demo implements the service worker architecture with IndexedDB storage and type-safe RPC communication.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│  Svelte Page (/journeys)                                    │
│  - Imports FlowsJourney, FlowsTask types                    │
│  - Uses getFlowsClient() client                                 │
│  - Displays data from IndexedDB                             │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │ MessageChannel RPC
                 │
┌────────────────▼────────────────────────────────────────────┐
│  FlowsClient (src/lib/flows-client-client.ts)                │
│  - Type-safe procedure calls                                 │
│  - Uses @thepia/flows-client/types                              │
│  - Communicates via MessageChannel                          │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │ postMessage
                 │
┌────────────────▼────────────────────────────────────────────┐
│  Service Worker (static/flows-sw.js)                        │
│  - Handles RPC calls                                         │
│  - Manages IndexedDB transactions                           │
│  - Seeds demo data on first load                            │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │ IndexedDB API
                 │
┌────────────────▼────────────────────────────────────────────┐
│  IndexedDB                                                   │
│  - journeys (3 demo records)                                │
│  - tasks (6 demo records)                                   │
│  - evidence (1 demo record)                                 │
│  - comments (1 demo record)                                 │
└─────────────────────────────────────────────────────────────┘
```

## Files

### Service Worker Layer

- **`static/flows-sw.js`** - Service worker with RPC handlers
  - IndexedDB schema creation
  - Query/mutation/sync procedures
  - MessageChannel message handler

- **`static/flows-sw-seed.js`** - Demo seed data
  - 3 journeys (onboarding, exit, performance review)
  - 6 tasks across journeys
  - 1 evidence record
  - 1 comment record

### Client Layer

- **`src/lib/flows-client-client.ts`** - Type-safe client
  - FlowsClient class
  - Singleton `getFlowsClient()` factory
  - Type-safe `query`, `mutation`, `sync` methods

### UI Layer

- **`src/routes/journeys/+page.svelte`** - Demo page
  - Lists all journeys from IndexedDB
  - Shows journey details and tasks
  - Demonstrates type-safe data access

## Type Safety

All data structures use types from `@thepia/flows-client`:

```typescript
import type {
  FlowsJourney,
  FlowsTask,
  FlowsProcedures,
  ProcedureInput,
  ProcedureOutput
} from '@thepia/flows-client/types';
```

The RPC interface provides full type inference:

```typescript
// Input is typed as ProcedureInput<'query.journeys'>
const journeys = await db.query.journeys({
  orderBy: [{ column: 'created_at', ascending: false }]
});
// Output is typed as FlowsJourney[]
```

## Running the Demo

1. **Install dependencies**:
   ```bash
   cd /Volumes/Projects/Thepia/flows-client
   pnpm install
   ```

2. **Start the demo**:
   ```bash
   pnpm demo:admin
   # or
   cd examples/flows-admin-demo
   pnpm dev
   ```

3. **Open the journeys page**:
   ```
   https://dev.thepia.net:5173/journeys
   ```

## What Happens on First Load

1. Page loads and calls `getFlowsClient()`
2. Service worker registers at `/flows-sw.js`
3. Service worker initializes IndexedDB with schema
4. Service worker checks if database is empty
5. If empty, seeds with demo data from `flows-sw-seed.js`
6. Page queries journeys via `db.query.journeys()`
7. Service worker handles RPC call and returns data from IndexedDB
8. Page renders journeys with full type safety

## Demo Data

### Journey 1: Employee Onboarding - Sarah Chen
- Status: `active`
- Progress: 35%
- 4 tasks (1 completed, 1 in progress, 2 pending)
- Security training with screen recording evidence

### Journey 2: Exit Process - Mike Johnson
- Status: `completed`
- Progress: 100%
- 2 tasks (all completed)
- Equipment return with photo evidence

### Journey 3: Q4 2025 Performance Review
- Status: `invited`
- Progress: 0%
- No tasks yet

## Testing the RPC Interface

Open browser console on `/journeys` page:

```javascript
// Get the client
const db = window.getFlowsClient();

// Query journeys
const journeys = await db.query.journeys({
  filter: { eq: { status: 'active' } }
});
console.log(journeys);

// Query tasks for a journey
const tasks = await db.query.tasksByJourney({
  journeyId: 'journey-001',
  orderBy: [{ column: 'order', ascending: true }]
});
console.log(tasks);

// Update a task
const updated = await db.mutation.updateTask({
  id: 'task-002',
  data: {
    status: 'completed',
    completed_at: new Date()
  }
});
console.log(updated);
```

## Next Steps

1. **Add Evidence Display** - Show evidence records (screen recordings, photos)
2. **Add Comments** - Display comments on tasks
3. **Add Mutations** - UI for updating journey progress
4. **Add Sync** - Background sync with Supabase
5. **Native Bridge** - Test in iOS/Android WebView with native SQLite

## Related Documentation

- [Service Worker Architecture](../../docs/SERVICE_WORKER_ARCHITECTURE.md)
- [Type System Usage](../../docs/TYPE_SYSTEM_USAGE.md)
- [Core Architecture Contracts](../../docs/CORE_ARCHITECTURE_CONTRACTS.md)
- [RPC Interface](../../docs/SERVICE_WORKER_RPC_INTERFACE.md)
