# Architecture Migration Plan

## Current Issues ❌

1. **Mixed Responsibilities**: Components handle UI + API calls + business logic
2. **Monolithic Store**: 1007-line `data.ts` mixing all domains
3. **Inconsistent Patterns**: Some components use stores, others bypass them
4. **Direct Database Calls**: Scattered throughout components
5. **No Separation of Concerns**: Hard to test and maintain

## Target Architecture ✅

### Domain-Driven Design with MVVM Pattern

```
Component (View)
    ↓ uses
Store (ViewModel) 
    ↓ calls
Service (Model/Business Logic)
    ↓ calls  
Database/API
```

## Migration Strategy

### Phase 1: Create Domain Stores (In Progress)
- [x] Client domain (complete)
- [x] TFC domain (complete)
- [ ] People domain
- [ ] Invitation domain
- [ ] Process domain

### Phase 2: Refactor Components
- [ ] Update TFCManagementPanel to use tfcStore
- [ ] Update FloatingStatusButton to use clientStore
- [ ] Create new ClientSelector component
- [ ] Update main +page.svelte to use domain stores

### Phase 3: Remove Legacy Code
- [ ] Remove direct Supabase calls from components
- [ ] Break down monolithic data.ts
- [ ] Update all imports to use domain stores

### Phase 4: Testing & Validation
- [ ] Add unit tests for services
- [ ] Add integration tests for stores
- [ ] Add component tests using domain stores

## Benefits

### 1. **Separation of Concerns**
```typescript
// ❌ Before: Mixed responsibilities in component
async function loadTFCData() {
  const { data, error } = await supabase.from('tfc_client_balances')...
  // Business logic mixed with API calls
  const timeSaved = data.total_used * 9;
  // UI state management
  loading = false;
}

// ✅ After: Clean separation
// Service handles API calls and business logic
const tfcService = new TFCService();
const timeSaved = tfcService.calculateTimeSavings(analytics);

// Store handles state management
const { timeSavings, loading } = tfcStore;
```

### 2. **Reactive State Management**
```typescript
// ❌ Before: Manual state tracking
let balance = null;
let loading = false;
$: timeSaved = balance ? balance.total_used * 9 : 0;

// ✅ After: Automatic reactivity
const { balance, loading, timeSavings } = tfcStore;
// timeSavings automatically updates when balance changes
```

### 3. **Reusable Business Logic**
```typescript
// ❌ Before: Logic duplicated across components
function calculateTimeSaved(totalUsed) {
  return totalUsed * 9; // Duplicated everywhere
}

// ✅ After: Centralized in service
tfcService.calculateTimeSavings(analytics); // Reusable everywhere
```

### 4. **Easy Testing**
```typescript
// ✅ Services are easily testable
describe('TFCService', () => {
  it('should calculate pricing correctly', () => {
    const pricing = tfcService.calculatePricing(1000);
    expect(pricing.tier).toBe('bulk_tier_1');
    expect(pricing.discountPercentage).toBe(25);
  });
});

// ✅ Stores can be tested in isolation
describe('TFCStore', () => {
  it('should update balance when loading data', async () => {
    await tfcStore.actions.loadTFCData('client-123');
    expect(get(tfcStore.balance)).toBeDefined();
  });
});
```

## Component Usage Examples

### Before (❌)
```svelte
<script>
const supabaseClient = createSupabaseClient(authStore, {
  clientCode: 'hygge-hvidlog'
});

let balance = null;
let loading = false;

onMount(async () => {
  loading = true;
  const { data } = await supabaseClient.from('tfc_client_balances')...
  balance = data;
  loading = false;
});

$: timeSaved = balance ? balance.total_used * 9 : 0;
</script>

{#if loading}Loading...{/if}
<div>Time Saved: {timeSaved} hours</div>
```

### After (✅)  
```svelte
<script>
import { tfcStore } from '$lib/stores/domains/tfc/tfc.store';
import { clientStore } from '$lib/stores/domains/client/client.store';

// Reactive data
const { balance, loading, timeSavings } = tfcStore;
const { currentClient } = clientStore;

// Load data when client changes
$: if ($currentClient) {
  tfcStore.actions.loadTFCData($currentClient.client_id);
}
</script>

{#if $loading}Loading...{/if}
<div>Time Saved: {$timeSavings.totalHoursSaved} hours</div>
```

## File Structure

```
src/lib/stores/domains/
├── client/
│   ├── client.types.ts    # TypeScript interfaces
│   ├── client.service.ts  # API calls & business logic  
│   ├── client.store.ts    # Svelte stores & state
│   └── index.ts           # Public exports
├── tfc/
│   ├── tfc.types.ts
│   ├── tfc.service.ts
│   ├── tfc.store.ts  
│   └── index.ts
└── people/
    ├── people.types.ts
    ├── people.service.ts
    ├── people.store.ts
    └── index.ts
```

## Next Steps

1. **Start with TFC refactoring** - Most complex domain with clear boundaries
2. **Update TFCManagementPanel** - Remove direct Supabase calls, use tfcStore
3. **Test thoroughly** - Ensure functionality is preserved
4. **Iterate on other domains** - Apply same pattern to People, Invitations, etc.
5. **Remove legacy code** - Clean up old patterns gradually