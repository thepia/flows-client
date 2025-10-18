# Type System Usage Guide

**Version**: 1.0.0
**Last Updated**: 2025-10-12

This guide demonstrates how to use the Flows Database type system across different parts of the Flows ecosystem.

## Overview

The `@thepia/flows-db` package provides comprehensive TypeScript types that ensure type safety across:

- **Browser applications** (Svelte, React, vanilla JS)
- **Service Worker implementations**
- **Native mobile apps** (iOS Swift, Android Kotlin via TypeScript bridge)
- **Backend services** (Supabase, Firebase, custom APIs)

## Installation

```bash
# In your Flows application
pnpm add @thepia/flows-db

# If using as types-only dependency
pnpm add -D @thepia/flows-db
```

## Core Type Categories

### 1. Entity Types

Entity types represent the core data structures stored and synchronized.

```typescript
import type {
  FlowsJourney,
  FlowsTask,
  FlowsAttachment,
  FlowsNote,
  FlowsComment,
  FlowsEvidence,
  FlowsInvitation,
} from '@thepia/flows-db/types';

// Example: Creating a journey
const journey: FlowsJourney = {
  id: crypto.randomUUID(),
  client_id: 'acme',
  app_id: 'flows',
  title: 'Employee Onboarding - Sarah Chen',
  description: 'Complete all onboarding tasks by first day',
  status: 'invited',
  invited_at: new Date(),
  owner_id: 'hr-manager-123',
  participants: ['sarah-chen-456', 'hr-manager-123', 'it-admin-789'],
  primary_participant_id: 'sarah-chen-456',
  progress_percentage: 0,
  created_at: new Date(),
  updated_at: new Date(),
  metadata: {
    department: 'Engineering',
    start_date: '2025-11-01',
    location: 'Remote',
  },
};

// Example: Creating a task
const task: FlowsTask = {
  id: crypto.randomUUID(),
  client_id: 'acme',
  app_id: 'flows',
  journey_id: journey.id,
  title: 'Complete security training',
  description: 'Watch security videos and pass quiz',
  status: 'pending',
  assigned_to: 'sarah-chen-456',
  assigned_by: 'hr-manager-123',
  due_date: new Date('2025-11-01T17:00:00Z'),
  order: 1,
  priority: 'high',
  estimated_duration: 60, // 60 minutes
  created_at: new Date(),
  updated_at: new Date(),
  metadata: {
    training_module_id: 'SEC-101',
    required_score: 80,
  },
};

// Example: Recording evidence
const evidence: FlowsEvidence = {
  id: crypto.randomUUID(),
  client_id: 'acme',
  app_id: 'flows',
  journey_id: journey.id,
  task_id: task.id,
  type: 'screen',
  filename: 'training-completion.webm',
  content_type: 'video/webm',
  size: 5242880, // 5MB
  duration: 180, // 3 minutes
  dimensions: { width: 1920, height: 1080 },
  storage_type: 'local',
  storage_path: '/evidence/screen-recordings/training-completion.webm',
  recorded_by: 'sarah-chen-456',
  recorded_at: new Date(),
  device_info: {
    platform: 'web',
    browser: 'Chrome 119',
  },
  processing_status: 'completed',
  created_at: new Date(),
  updated_at: new Date(),
  metadata: {
    quiz_score: 95,
  },
};
```

### 2. Procedure Types

Procedure types define the type-safe RPC interface between client and storage layer.

```typescript
import type {
  FlowsDBProcedures,
  ProcedureInput,
  ProcedureOutput,
  QueryOptions,
  Filter,
} from '@thepia/flows-db/types';

// Example: Type-safe query input
const queryInput: ProcedureInput<'query.tasks'> = {
  filter: {
    eq: { journey_id: journey.id, status: 'pending' },
  },
  orderBy: [{ column: 'order', ascending: true }],
  limit: 10,
};

// Example: Type-safe query output (auto-inferred)
const tasks: ProcedureOutput<'query.tasks'> = await db.query.tasks(queryInput);
// tasks is typed as FlowsTask[]

// Example: Type-safe mutation input
const updateInput: ProcedureInput<'mutation.updateTask'> = {
  id: task.id,
  data: {
    status: 'completed',
    completed_at: new Date(),
    progress_percentage: 100,
  },
};

// Example: Complex filter
const filter: Filter = {
  eq: { client_id: 'acme', status: 'active' },
  gte: { progress_percentage: 50 },
  in: { priority: ['high', 'urgent'] },
  ilike: { title: '%onboarding%' },
};

const journeys: ProcedureOutput<'query.journeys'> = await db.query.journeys({
  filter,
  orderBy: [{ column: 'created_at', ascending: false }],
});
```

### 3. Transport Types

Transport types define the communication layer abstraction.

```typescript
import type {
  Transport,
  Environment,
  TransportMessage,
  BrowserTransport,
  NativeTransport,
} from '@thepia/flows-db/types';
import { detectEnvironment } from '@thepia/flows-db/types';

// Detect current environment
const env: Environment = detectEnvironment();

if (env.type === 'browser' && env.capabilities.serviceWorker) {
  // Use Service Worker transport
  const transport: BrowserTransport = createBrowserTransport();
} else if (env.type === 'native-webview' && env.capabilities.nativeBridge) {
  // Use native bridge transport
  const transport: NativeTransport = createNativeTransport();
}

// Transport messages are typed
const message: TransportMessage = {
  id: crypto.randomUUID(),
  type: 'request',
  procedure: 'query.tasks',
  payload: { filter: { eq: { status: 'pending' } } },
};

const response: TransportMessage = await transport.send(message);
if (response.error) {
  console.error('Transport error:', response.error);
} else {
  const tasks = response.payload as FlowsTask[];
}
```

### 4. Utility Types

Utility types help with common patterns.

```typescript
import type {
  FlowsEntityCreate,
  FlowsEntityUpdate,
  GetFlowsEntity,
} from '@thepia/flows-db/types';

// Create input (excludes id, created_at, updated_at)
const createTaskInput: FlowsEntityCreate<FlowsTask> = {
  client_id: 'acme',
  app_id: 'flows',
  journey_id: journey.id,
  title: 'Setup laptop',
  status: 'pending',
  // id, created_at, updated_at not required
};

// Update input (all fields optional except id)
const updateTaskInput: FlowsEntityUpdate<FlowsTask> = {
  status: 'in_progress',
  started_at: new Date(),
  // Only fields being updated
};

// Get entity type by string
type TaskEntity = GetFlowsEntity<'task'>; // Resolves to FlowsTask
type JourneyEntity = GetFlowsEntity<'journey'>; // Resolves to FlowsJourney
```

## Integration Examples

### Svelte Application

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import type {
    FlowsJourney,
    FlowsTask,
    FlowsDBProcedures,
    Transport,
  } from '@thepia/flows-db/types';

  let journeys: FlowsJourney[] = [];
  let selectedJourney: FlowsJourney | null = null;
  let tasks: FlowsTask[] = [];

  onMount(async () => {
    // Load database client
    const { createFlowsDB } = await import('./lib/flows-db-client');
    const db = createFlowsDB();

    // Fetch journeys (fully typed)
    journeys = await db.query.journeys({
      filter: { eq: { status: 'active' } },
      orderBy: [{ column: 'created_at', ascending: false }],
    });
  });

  async function selectJourney(journey: FlowsJourney) {
    selectedJourney = journey;

    // Fetch tasks for journey (fully typed)
    tasks = await db.query.tasksByJourney({
      journeyId: journey.id,
      orderBy: [{ column: 'order', ascending: true }],
    });
  }

  async function completeTask(taskId: string) {
    // Update task (fully typed)
    const updated = await db.mutation.updateTask({
      id: taskId,
      data: {
        status: 'completed',
        completed_at: new Date(),
      },
    });

    // Refresh task list
    if (selectedJourney) {
      await selectJourney(selectedJourney);
    }
  }
</script>

{#each journeys as journey}
  <button on:click={() => selectJourney(journey)}>
    {journey.title} - {journey.progress_percentage}%
  </button>
{/each}

{#if selectedJourney}
  {#each tasks as task}
    <div>
      <h3>{task.title}</h3>
      <p>{task.description}</p>
      <button on:click={() => completeTask(task.id)}>
        Mark Complete
      </button>
    </div>
  {/each}
{/if}
```

### Service Worker Implementation

```typescript
// service-worker.ts
import type {
  FlowsDBProcedures,
  ProcedureContext,
  TransportMessage,
} from '@thepia/flows-db/types';

// Define procedure handlers
const handlers: {
  [K in keyof FlowsDBProcedures]: (
    input: FlowsDBProcedures[K]['input'],
    context: ProcedureContext
  ) => Promise<FlowsDBProcedures[K]['output']>;
} = {
  'query.tasks': async (input, context) => {
    // Implementation with type safety
    const db = await getIndexedDB();
    const tasks = await db
      .transaction('tasks', 'readonly')
      .objectStore('tasks')
      .getAll();

    // Filter tasks based on input.filter
    return applyFilter(tasks, input.filter);
  },

  'mutation.updateTask': async (input, context) => {
    const db = await getIndexedDB();
    const store = db.transaction('tasks', 'readwrite').objectStore('tasks');

    const task = await store.get(input.id);
    if (!task) throw new Error('Task not found');

    const updated = { ...task, ...input.data, updated_at: new Date() };
    await store.put(updated);

    return updated;
  },

  // ... other handlers
};

// Message handler
self.addEventListener('message', async (event) => {
  const message: TransportMessage = event.data;

  if (message.type === 'request' && message.procedure) {
    try {
      const handler = handlers[message.procedure as keyof FlowsDBProcedures];
      const context: ProcedureContext = {
        clientId: 'acme',
        appId: 'flows',
        userId: 'user-123',
      };

      const result = await handler(message.payload, context);

      const response: TransportMessage = {
        id: message.id,
        type: 'response',
        payload: result,
      };

      event.ports[0]?.postMessage(response);
    } catch (error) {
      const response: TransportMessage = {
        id: message.id,
        type: 'response',
        payload: null,
        error: {
          code: 'PROCEDURE_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      };

      event.ports[0]?.postMessage(response);
    }
  }
});
```

### Native iOS Implementation (Swift)

```swift
// FlowsDBTypes.swift
// These would be generated from TypeScript types

struct FlowsJourney: Codable {
    let id: String
    let clientId: String
    let appId: String
    let title: String
    let description: String?
    let status: JourneyStatus
    let invitedAt: Date
    let startedAt: Date?
    let endedAt: Date?
    let ownerId: String
    let participants: [String]
    let progressPercentage: Int?
    let createdAt: Date
    let updatedAt: Date
    let metadata: [String: AnyCodable]

    enum JourneyStatus: String, Codable {
        case invited, active, completed, cancelled, archived
    }
}

// FlowsDBHandler.swift
class FlowsDBHandler {
    private let db: SQLiteDatabase

    func queryTasks(filter: QueryFilter) throws -> [FlowsTask] {
        let sql = buildQuery(table: "tasks", filter: filter)
        let rows = try db.query(sql)
        return rows.map { decodeTask($0) }
    }

    func updateTask(id: String, data: TaskUpdate) throws -> FlowsTask {
        let task = try getTask(id: id)
        var updated = task

        if let status = data.status {
            updated.status = status
        }
        if let completedAt = data.completedAt {
            updated.completedAt = completedAt
        }

        updated.updatedAt = Date()

        try db.update(table: "tasks", id: id, data: encodeTask(updated))
        return updated
    }
}

// JavaScript Bridge
class FlowsDBBridge: NSObject, WKScriptMessageHandler {
    private let handler: FlowsDBHandler

    func userContentController(
        _ userContentController: WKUserContentController,
        didReceive message: WKScriptMessage
    ) {
        guard let body = message.body as? [String: Any],
              let procedure = body["procedure"] as? String,
              let payload = body["payload"] else {
            return
        }

        do {
            let result: Any

            switch procedure {
            case "query.tasks":
                let input = try JSONDecoder().decode(
                    QueryOptions.self,
                    from: JSONSerialization.data(withJSONObject: payload)
                )
                result = try handler.queryTasks(filter: input.filter ?? QueryFilter())

            case "mutation.updateTask":
                let input = try JSONDecoder().decode(
                    UpdateTaskInput.self,
                    from: JSONSerialization.data(withJSONObject: payload)
                )
                result = try handler.updateTask(id: input.id, data: input.data)

            default:
                throw NSError(domain: "FlowsDB", code: 404, userInfo: [
                    NSLocalizedDescriptionKey: "Unknown procedure: \(procedure)"
                ])
            }

            let response = [
                "id": body["id"] as Any,
                "type": "response",
                "payload": result
            ]

            evaluateJavaScript(
                "window.handleFlowsDBResponse(\(JSONStringify(response)))"
            )

        } catch {
            let response = [
                "id": body["id"] as Any,
                "type": "response",
                "error": [
                    "code": "NATIVE_ERROR",
                    "message": error.localizedDescription
                ]
            ]

            evaluateJavaScript(
                "window.handleFlowsDBResponse(\(JSONStringify(response)))"
            )
        }
    }
}
```

## Best Practices

### 1. Import Only What You Need

```typescript
// ❌ Don't import everything
import * as FlowsTypes from '@thepia/flows-db/types';

// ✅ Import specific types
import type { FlowsJourney, FlowsTask } from '@thepia/flows-db/types';
```

### 2. Use Utility Types for Mutations

```typescript
// ✅ Use FlowsEntityCreate for insert operations
const createInput: FlowsEntityCreate<FlowsTask> = {
  // Excludes id, created_at, updated_at
  client_id: 'acme',
  app_id: 'flows',
  title: 'New task',
  status: 'pending',
};

// ✅ Use FlowsEntityUpdate for update operations
const updateInput: FlowsEntityUpdate<FlowsTask> = {
  // All fields optional
  status: 'completed',
};
```

### 3. Type Guard Functions

```typescript
import type { FlowsJourney, FlowsTask } from '@thepia/flows-db/types';

function isJourney(entity: unknown): entity is FlowsJourney {
  return (
    typeof entity === 'object' &&
    entity !== null &&
    'journey_id' in entity === false &&
    'title' in entity &&
    'status' in entity &&
    ['invited', 'active', 'completed', 'cancelled', 'archived'].includes(
      (entity as any).status
    )
  );
}

function isTask(entity: unknown): entity is FlowsTask {
  return (
    typeof entity === 'object' &&
    entity !== null &&
    'journey_id' in entity &&
    'title' in entity &&
    'status' in entity
  );
}
```

### 4. Extend Metadata Types

```typescript
import type { FlowsJourney } from '@thepia/flows-db/types';

// Extend for app-specific metadata
interface OnboardingJourney extends FlowsJourney {
  metadata: {
    department: string;
    start_date: string;
    location: string;
    manager_id: string;
  };
}

const journey: OnboardingJourney = {
  // ... base fields
  metadata: {
    department: 'Engineering',
    start_date: '2025-11-01',
    location: 'Remote',
    manager_id: 'mgr-123',
  },
};
```

## Related Documentation

- [Flows Data Types](./FLOWS_DATA_TYPES.md) - Entity definitions and relationships
- [Service Worker RPC Interface](./SERVICE_WORKER_RPC_INTERFACE.md) - Procedure definitions
- [Core Architecture Contracts](./CORE_ARCHITECTURE_CONTRACTS.md) - System boundaries
- [Client Storage Abstraction](./CLIENT_STORAGE_ABSTRACTION.md) - Client implementation patterns
