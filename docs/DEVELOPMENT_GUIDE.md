# Development Guide - Flows DB

**📋 CONSOLIDATED**: This document combines development patterns, type system, component architecture, and service worker patterns.

## Overview

This guide provides comprehensive development guidance for the Flows Database project, covering TypeScript patterns, component architecture, service worker integration, and AI assistant context for effective development.

## Repository Context

### Maturity Level: Advanced Demo → Production Transition
- **Strengths**: Excellent technical architecture, comprehensive demo capabilities
- **Focus**: Bridge demo sophistication with enterprise operational needs
- **Business Model**: HR lifecycle management (150 EUR/CHF per workflow + enterprise licensing)
- **Target Market**: Mid-market to enterprise clients (500-15,000 employees)

## TypeScript Type System

### Core Entity Types
**Location**: `src/types/flows-entities.ts`

#### Base Interfaces
```typescript
// Base interface for all entities
interface FlowsEntity {
  id: string;
  created_at: string;
  updated_at?: string;
}

// Core entities
interface FlowsClient extends FlowsEntity {
  name: string;
  slug: string;
  industry?: string;
  employee_count?: number;
}

interface FlowsPerson extends FlowsEntity {
  client_id: string;
  email: string;
  first_name: string;
  last_name: string;
  department?: string;
  position?: string;
}
```

#### Database Integration Types
```typescript
// Supabase integration
type SupabaseClient = ReturnType<typeof createClient>;
type DatabaseRow<T> = T & { id: string };
type InsertData<T> = Omit<T, 'id' | 'created_at' | 'updated_at'>;
type UpdateData<T> = Partial<InsertData<T>>;
```

### Type Safety Patterns

#### API Response Types
```typescript
// Standardized API responses
interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  status: 'success' | 'error' | 'loading';
}

// Database query results
type QueryResult<T> = {
  data: T[] | null;
  error: PostgrestError | null;
  count?: number;
};
```

#### Service Worker Types
```typescript
// Service worker communication
interface ServiceWorkerMessage {
  type: string;
  payload: unknown;
  requestId?: string;
}

interface ServiceWorkerResponse {
  type: string;
  payload: unknown;
  requestId?: string;
  error?: string;
}
```

## Component Architecture Patterns

### Component Separation Strategy

#### Current Issues (Pre-Refactoring)
- **Monolithic components**: 400+ line files with mixed concerns
- **Repeated patterns**: Similar card structures throughout
- **Poor reusability**: Logic duplicated across components
- **Complex state management**: Multiple UI states in single components

#### Refactoring Approach

##### 1. Extract Reusable Components
```svelte
<!-- Before: Monolithic dashboard -->
<script>
  // 400+ lines of mixed logic
</script>

<!-- After: Composed components -->
<script>
  import MetricsCard from '$lib/components/MetricsCard.svelte';
  import InvitationManager from '$lib/components/InvitationManager.svelte';
  import ClientSelector from '$lib/components/ClientSelector.svelte';
</script>

<MetricsCard {metrics} />
<InvitationManager {invitations} on:invite={handleInvite} />
<ClientSelector {clients} bind:selected={selectedClient} />
```

##### 2. Separate Data and UI Logic
```typescript
// stores/dashboard.ts - Data logic
export const dashboardStore = writable({
  metrics: null,
  invitations: [],
  loading: false
});

export const loadDashboardData = async (clientId: string) => {
  dashboardStore.update(state => ({ ...state, loading: true }));
  // Data loading logic
};
```

```svelte
<!-- Dashboard.svelte - UI only -->
<script>
  import { dashboardStore, loadDashboardData } from '$lib/stores/dashboard';
  
  $: if (selectedClient) {
    loadDashboardData(selectedClient.id);
  }
</script>
```

##### 3. Component Composition Patterns
```svelte
<!-- Card.svelte - Base component -->
<div class="card">
  <header class="card-header">
    <slot name="header" />
  </header>
  <div class="card-content">
    <slot />
  </div>
</div>

<!-- MetricsCard.svelte - Specialized component -->
<Card>
  <svelte:fragment slot="header">
    <h3>Metrics</h3>
  </svelte:fragment>
  
  <MetricsDisplay {data} />
</Card>
```

## Service Worker Integration

### Communication Patterns

#### MessageChannel Pattern (Current Implementation)
```javascript
// Main thread - Request/Response RPC pattern
const messageChannel = new MessageChannel();
const requestId = crypto.randomUUID();

messageChannel.port1.onmessage = (event) => {
  const response = event.data;
  if (response.error) {
    reject(new Error(response.error.message));
  } else {
    resolve(response.payload);
  }
};

const message = {
  id: requestId,
  type: 'request',
  procedure: 'query.tasks',
  payload: { clientId: 'abc123' }
};

worker.postMessage(message, [messageChannel.port2]);
```
#### Configuration Passing
```javascript
// Pass config during SW registration
navigator.serviceWorker.register('/sw.js', {
  scope: '/',
  updateViaCache: 'none'
}).then(registration => {
  // Send config to SW
  navigator.serviceWorker.controller?.postMessage({
    type: 'CONFIG',
    payload: {
      apiBaseUrl: 'https://api.thepia.com',
      clientId: 'current-client-id'
    }
  });
});
```

### Native App Integration

#### WebView Bridge Pattern
```javascript
// Detect native environment
const isNativeApp = window.webkit?.messageHandlers?.flowsApp || 
                   window.Android?.flowsApp;

// Native bridge communication
if (isNativeApp) {
  // Use native bridge instead of MessageChannel
  window.webkit?.messageHandlers?.flowsApp?.postMessage({
    type: 'SYNC_REQUEST',
    payload: data
  });
} else {
  // Use MessageChannel service worker
  channel.postMessage({ type: 'SYNC_REQUEST', payload: data });
}
```

#### Adapter Pattern
```typescript
// Abstract transport interface
interface TransportAdapter {
  send(message: ServiceWorkerMessage): Promise<ServiceWorkerResponse>;
  subscribe(callback: (message: ServiceWorkerMessage) => void): void;
}

// Service worker implementation
class ServiceWorkerAdapter implements TransportAdapter {
  private worker: ServiceWorker;
  
  async send(message: ServiceWorkerMessage): Promise<ServiceWorkerResponse> {
    return new Promise((resolve) => {
      const requestId = crypto.randomUUID();
      // Implementation
    });
  }
}

// Native app implementation
class NativeAdapter implements TransportAdapter {
  async send(message: ServiceWorkerMessage): Promise<ServiceWorkerResponse> {
    // Native bridge implementation
  }
}
```

## Development Best Practices

### Code Organization
```
src/
├── lib/
│   ├── components/          # Reusable UI components
│   ├── stores/             # Svelte stores for state management
│   ├── services/           # Business logic and API calls
│   ├── types/              # TypeScript type definitions
│   └── utils/              # Utility functions
├── routes/                 # SvelteKit routes
└── app.html               # App shell
```

### Testing Strategy
```typescript
// Component testing
import { render, screen } from '@testing-library/svelte';
import MetricsCard from '$lib/components/MetricsCard.svelte';

test('displays metrics correctly', () => {
  const metrics = { activeUsers: 150, completedTasks: 45 };
  render(MetricsCard, { props: { metrics } });
  
  expect(screen.getByText('150')).toBeInTheDocument();
  expect(screen.getByText('45')).toBeInTheDocument();
});
```

### Performance Considerations
- **Lazy loading**: Use dynamic imports for large components
- **Virtual scrolling**: For large lists (1000+ employees)
- **Debounced search**: Prevent excessive API calls
- **Optimistic updates**: Update UI before API confirmation

## AI Assistant Context

### Development Priorities
1. **Production readiness**: Focus on operational procedures
2. **Enterprise integration**: Documentation for large-scale deployments
3. **Performance optimization**: Handle 1000+ employee datasets
4. **Security hardening**: Production-grade security patterns

### Common Patterns
- **Multi-tenant isolation**: Always consider `client_id` filtering
- **RLS policy integration**: Ensure UI respects database permissions
- **Error handling**: Comprehensive error states and user feedback
- **Offline support**: Service worker caching and sync patterns

### Architecture Decisions
- **Privacy-first**: No unnecessary data collection
- **Middleware-free**: Direct database integration via Supabase
- **Nordic design**: Clean, functional UI patterns
- **Mobile-first**: Responsive design for all screen sizes

## Related Documentation

### Core Architecture
- `docs/DATABASE_ARCHITECTURE.md` - Database schema and RLS policies
- `docs/USER_ROLE_MANAGEMENT.md` - Authentication and authorization
- `docs/API_REFERENCE.md` - API endpoints and contracts

### Detailed References
- `docs/client/` - Service worker implementation details
- `src/types/` - Complete TypeScript type definitions
- `examples/` - Working implementation examples

---

**Document Status**: ✅ Current - Consolidated development guidance
**Last Updated**: January 2025 - Combined development patterns and architecture
**Replaces**: CLAUDE_CODE_GUIDANCE.md, TYPE_SYSTEM_IMPLEMENTATION.md, TYPE_SYSTEM_USAGE.md, COMPONENT_SEPARATION_ANALYSIS.md, COMPONENT_SEPARATION_EXAMPLES.md, client/ documentation
