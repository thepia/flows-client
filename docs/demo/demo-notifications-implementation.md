# Demo Notifications Implementation Guide

## Overview

This document describes how to implement simple notification support in the flows-admin-demo web application as a demonstration of the notification patterns described in the comprehensive [Notifications System Architecture](https://github.com/thepia/thepia.com/blob/main/docs/flows/notifications-architecture.md).

## Goals

- **Demonstrate notification patterns** for prospect and internal demos
- **Minimal complexity** - Web Push API only (no FCM/APNs needed for web demo)
- **Client-only implementation** - No server-side dependencies for demo
- **Real-time feel** - Immediate visual feedback with simulated delivery
- **Stakeholder awareness** - Show multi-stakeholder notification concepts

## Implementation Strategy

### Phase 1: Mock Notification System (Demo-Ready)

**Scope**: Visual notification system with local state management
**Timeline**: 1-2 days
**Purpose**: Demo readiness for prospects and internal presentations

#### Features
- Visual notification bell icon with badge count
- In-app notification panel with realistic demo data
- Toast notifications for immediate actions
- Notification preferences panel (UI only)
- Multi-stakeholder demonstration scenarios

#### Architecture
```
┌─────────────────────────────────┐
│        Demo Web App             │
│                                 │
│  ┌─────────────────────────────┐│
│  │   Notification Service      ││
│  │   • Mock data generation    ││
│  │   • Local state mgmt       ││
│  │   • Demo scenarios         ││
│  └─────────────────────────────┘│
│                                 │
│  ┌─────────────────────────────┐│
│  │      UI Components          ││
│  │   • NotificationBell        ││
│  │   • NotificationPanel       ││
│  │   • ToastNotifications      ││
│  │   • NotificationSettings    ││
│  └─────────────────────────────┘│
└─────────────────────────────────┘
```

### Phase 2: Web Push Integration (Optional Enhancement)

**Scope**: Real browser notifications for enhanced demo experience
**Timeline**: 1-2 additional days
**Purpose**: Show actual notification delivery capabilities

## Implementation Details

### 1. Core Types and Interfaces

```typescript
// /src/lib/types/notifications.ts
export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  timestamp: string;
  read: boolean;
  urgent: boolean;
  stakeholders: StakeholderInfo[];
  actionUrl?: string;
  expiresAt?: string;
}

export enum NotificationType {
  TASK_ASSIGNED = 'task_assigned',
  APPROVAL_REQUIRED = 'approval_required',
  DOCUMENT_UPLOADED = 'document_uploaded',
  PROCESS_COMPLETED = 'process_completed',
  DEADLINE_APPROACHING = 'deadline_approaching',
  SYSTEM_ALERT = 'system_alert'
}

export interface StakeholderInfo {
  role: 'assignee' | 'manager' | 'hr' | 'compliance' | 'observer';
  userId: string;
  name: string;
  notified: boolean;
  notificationMethod: 'push' | 'email' | 'sms';
}

export interface NotificationPreferences {
  enabled: boolean;
  types: Record<NotificationType, boolean>;
  quiet_hours: {
    enabled: boolean;
    start: string;
    end: string;
  };
  digest_mode: 'immediate' | '15min' | '1hour' | 'daily';
}
```

### 2. Notification Service

```typescript
// /src/lib/services/notificationService.ts
import { writable } from 'svelte/store';
import type { Notification, NotificationPreferences } from '$lib/types/notifications';

class NotificationService {
  private notifications = writable<Notification[]>([]);
  private unreadCount = writable<number>(0);
  private preferences = writable<NotificationPreferences>(this.getDefaultPreferences());

  // Mock demo data generation
  generateDemoNotifications(clientId: string): Notification[] {
    const scenarios = this.getDemoScenarios(clientId);
    return scenarios.map(scenario => this.createNotification(scenario));
  }

  // Simulate receiving a new notification
  receiveNotification(notification: Notification) {
    this.notifications.update(current => [notification, ...current]);
    this.updateUnreadCount();
    
    // Show toast for immediate notifications
    if (notification.urgent || this.shouldShowToast(notification)) {
      this.showToast(notification);
    }
  }

  // Mark notification as read
  markAsRead(notificationId: string) {
    this.notifications.update(current =>
      current.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
    this.updateUnreadCount();
  }

  // Demo scenarios based on client
  private getDemoScenarios(clientId: string) {
    const baseScenarios = [
      {
        type: 'task_assigned',
        title: 'New Onboarding Task',
        body: 'IT setup required for Sarah Johnson',
        stakeholders: [
          { role: 'assignee', name: 'IT Team', notified: true },
          { role: 'manager', name: 'Michael Chen', notified: true },
          { role: 'hr', name: 'Lisa Park', notified: false }
        ]
      },
      {
        type: 'approval_required',
        title: 'Document Review Needed',
        body: 'Contract approval required for new hire',
        urgent: true,
        stakeholders: [
          { role: 'manager', name: 'David Wilson', notified: true },
          { role: 'hr', name: 'Lisa Park', notified: true }
        ]
      }
    ];

    // Customize scenarios based on client demo data
    return this.customizeForClient(baseScenarios, clientId);
  }

  // Store getters for components
  get notifications() { return this.notifications; }
  get unreadCount() { return this.unreadCount; }
  get preferences() { return this.preferences; }
}

export const notificationService = new NotificationService();
```

### 3. UI Components

#### Notification Bell Component
```svelte
<!-- /src/lib/components/notifications/NotificationBell.svelte -->
<script lang="ts">
  import { Bell } from 'lucide-svelte';
  import { notificationService } from '$lib/services/notificationService';
  import { Badge } from '$lib/components/ui/badge';
  
  export let onClick: () => void;
  
  $: unreadCount = $notificationService.unreadCount;
</script>

<button
  class="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
  on:click={onClick}
  aria-label="Notifications"
>
  <Bell class="h-5 w-5" />
  {#if unreadCount > 0}
    <Badge
      variant="destructive"
      class="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs"
    >
      {unreadCount > 9 ? '9+' : unreadCount}
    </Badge>
  {/if}
</button>
```

#### Notification Panel Component
```svelte
<!-- /src/lib/components/notifications/NotificationPanel.svelte -->
<script lang="ts">
  import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
  import { Button } from '$lib/components/ui/button';
  import { notificationService } from '$lib/services/notificationService';
  import NotificationItem from './NotificationItem.svelte';
  import NotificationFilters from './NotificationFilters.svelte';
  
  export let isOpen: boolean = false;
  
  $: notifications = $notificationService.notifications;
  
  let filterType: string = 'all';
  let showUnreadOnly: boolean = false;
  
  $: filteredNotifications = notifications.filter(n => {
    if (showUnreadOnly && n.read) return false;
    if (filterType !== 'all' && n.type !== filterType) return false;
    return true;
  });
  
  function markAllAsRead() {
    notifications.forEach(n => {
      if (!n.read) notificationService.markAsRead(n.id);
    });
  }
</script>

{#if isOpen}
  <div class="absolute right-0 top-12 w-96 z-50">
    <Card class="shadow-lg border">
      <CardHeader class="flex flex-row items-center justify-between pb-2">
        <CardTitle class="text-lg">Notifications</CardTitle>
        <Button variant="ghost" size="sm" on:click={markAllAsRead}>
          Mark all read
        </Button>
      </CardHeader>
      
      <CardContent class="p-0">
        <NotificationFilters
          bind:filterType
          bind:showUnreadOnly
        />
        
        <div class="max-h-96 overflow-y-auto">
          {#each filteredNotifications as notification}
            <NotificationItem
              {notification}
              on:read={() => notificationService.markAsRead(notification.id)}
            />
          {:else}
            <div class="p-4 text-center text-gray-500">
              No notifications
            </div>
          {/each}
        </div>
      </CardContent>
    </Card>
  </div>
{/if}
```

#### Notification Item Component
```svelte
<!-- /src/lib/components/notifications/NotificationItem.svelte -->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { Badge } from '$lib/components/ui/badge';
  import { formatDistanceToNow } from 'date-fns';
  import type { Notification } from '$lib/types/notifications';
  
  export let notification: Notification;
  
  const dispatch = createEventDispatcher();
  
  function handleClick() {
    if (!notification.read) {
      dispatch('read');
    }
    
    if (notification.actionUrl) {
      // Navigate to relevant page
      window.location.href = notification.actionUrl;
    }
  }
  
  $: timeAgo = formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true });
</script>

<div
  class="p-3 border-b cursor-pointer hover:bg-gray-50 transition-colors {notification.read ? 'opacity-75' : ''}"
  on:click={handleClick}
  on:keydown={(e) => e.key === 'Enter' && handleClick()}
  role="button"
  tabindex="0"
>
  <div class="flex items-start justify-between">
    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-2 mb-1">
        <h4 class="text-sm font-medium truncate">{notification.title}</h4>
        {#if notification.urgent}
          <Badge variant="destructive" class="text-xs">Urgent</Badge>
        {/if}
        {#if !notification.read}
          <div class="w-2 h-2 bg-blue-500 rounded-full"></div>
        {/if}
      </div>
      
      <p class="text-sm text-gray-600 line-clamp-2">{notification.body}</p>
      
      <!-- Stakeholder info for demo -->
      {#if notification.stakeholders.length > 0}
        <div class="mt-2 flex flex-wrap gap-1">
          {#each notification.stakeholders.slice(0, 3) as stakeholder}
            <Badge variant="outline" class="text-xs">
              {stakeholder.name} ({stakeholder.role})
              {#if stakeholder.notified}✓{:else}⏳{/if}
            </Badge>
          {/each}
          {#if notification.stakeholders.length > 3}
            <Badge variant="outline" class="text-xs">
              +{notification.stakeholders.length - 3} more
            </Badge>
          {/if}
        </div>
      {/if}
    </div>
    
    <span class="text-xs text-gray-400 ml-2">{timeAgo}</span>
  </div>
</div>
```

### 4. Integration with Existing Demo

#### Update App Header
```svelte
<!-- /src/lib/components/layout/AppHeader.svelte -->
<script lang="ts">
  // ... existing imports
  import NotificationBell from '$lib/components/notifications/NotificationBell.svelte';
  import NotificationPanel from '$lib/components/notifications/NotificationPanel.svelte';
  
  let showNotifications = false;
  
  function toggleNotifications() {
    showNotifications = !showNotifications;
  }
</script>

<!-- Add to header actions -->
<div class="flex items-center gap-4">
  <!-- Existing header content -->
  
  <div class="relative">
    <NotificationBell onClick={toggleNotifications} />
    <NotificationPanel isOpen={showNotifications} />
  </div>
  
  <!-- Existing settings, etc. -->
</div>
```

#### Initialize Demo Notifications
```typescript
// /src/lib/stores/data.ts - Update loadClientData function
export async function loadClientData(clientId: number) {
  try {
    // ... existing client loading code

    // Generate demo notifications for this client
    const demoNotifications = notificationService.generateDemoNotifications(currentClientData.client_code);
    
    // Simulate receiving notifications over time for demo effect
    setTimeout(() => {
      demoNotifications.forEach((notification, index) => {
        setTimeout(() => {
          notificationService.receiveNotification(notification);
        }, index * 2000); // Stagger notifications every 2 seconds
      });
    }, 1000);

    // ... rest of existing code
  } catch (error) {
    console.error('Error loading client data:', error);
  }
}
```

### 5. Demo Scenarios by Client

```typescript
// /src/lib/services/notificationService.ts - Enhanced demo scenarios
private customizeForClient(baseScenarios: any[], clientId: string) {
  const clientScenarios = {
    'hygge-hvidlog': [
      {
        type: 'task_assigned',
        title: 'New Team Member Onboarding',
        body: 'Sofie Nielsen needs workspace setup in Copenhagen office',
        stakeholders: [
          { role: 'assignee', name: 'IT Copenhagen', notified: true },
          { role: 'manager', name: 'Lars Andersen', notified: true },
          { role: 'hr', name: 'Mette Hansen', notified: false }
        ]
      },
      {
        type: 'approval_required',
        title: 'GDPR Compliance Review',
        body: 'Data processing agreement needs legal approval',
        urgent: true,
        stakeholders: [
          { role: 'compliance', name: 'Legal Team', notified: true },
          { role: 'manager', name: 'CEO', notified: true }
        ]
      }
    ],
    'meridian-brands': [
      {
        type: 'document_uploaded',
        title: 'Background Check Complete',
        body: 'Background verification completed for Alex Chen',
        stakeholders: [
          { role: 'hr', name: 'Jennifer Martinez', notified: true },
          { role: 'manager', name: 'Director of Operations', notified: false }
        ]
      },
      {
        type: 'deadline_approaching',
        title: 'Training Deadline',
        body: 'Compliance training due in 2 days for 5 employees',
        stakeholders: [
          { role: 'hr', name: 'HR Team', notified: true },
          { role: 'compliance', name: 'Training Coordinator', notified: true }
        ]
      }
    ],
    'test-demo': [
      {
        type: 'system_alert',
        title: 'Test Notification',
        body: 'This is a test notification for demo purposes',
        stakeholders: [
          { role: 'assignee', name: 'Test User', notified: true }
        ]
      }
    ]
  };

  return clientScenarios[clientId] || baseScenarios;
}
```

### 6. Toast Notifications

```svelte
<!-- /src/lib/components/notifications/ToastNotifications.svelte -->
<script lang="ts">
  import { fade, fly } from 'svelte/transition';
  import { notificationService } from '$lib/services/notificationService';
  import { Button } from '$lib/components/ui/button';
  import { X } from 'lucide-svelte';
  
  let toasts: Array<{id: string, notification: Notification, timeout: number}> = [];
  
  function showToast(notification: Notification) {
    const toast = {
      id: Math.random().toString(36),
      notification,
      timeout: setTimeout(() => removeToast(id), 5000)
    };
    
    toasts = [...toasts, toast];
  }
  
  function removeToast(id: string) {
    const toast = toasts.find(t => t.id === id);
    if (toast) {
      clearTimeout(toast.timeout);
      toasts = toasts.filter(t => t.id !== id);
    }
  }
  
  // Subscribe to notification service
  notificationService.onToast = showToast;
</script>

<div class="fixed top-4 right-4 z-50 space-y-2">
  {#each toasts as toast (toast.id)}
    <div
      class="bg-white border shadow-lg rounded-lg p-4 max-w-sm"
      transition:fly="{{ x: 300, duration: 300 }}"
    >
      <div class="flex items-start justify-between">
        <div class="flex-1">
          <h4 class="font-medium text-sm">{toast.notification.title}</h4>
          <p class="text-sm text-gray-600 mt-1">{toast.notification.body}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          class="p-1 h-auto"
          on:click={() => removeToast(toast.id)}
        >
          <X class="h-4 w-4" />
        </Button>
      </div>
    </div>
  {/each}
</div>
```

## Demo Flow and Presentation

### Demo Script Integration

1. **Initial State**: Show notification bell with unread badge
2. **Client Switch**: Generate new notifications relevant to the client
3. **Interaction**: Click bell to show panel with stakeholder information
4. **Real-time Feel**: New notifications appear as toast notifications
5. **Multi-stakeholder Story**: Highlight how different roles get notified

### Key Demo Points

- **Multi-stakeholder notifications**: Show how one action triggers notifications to multiple roles
- **Client-specific scenarios**: Different notification types per demo client
- **Real-time updates**: Immediate visual feedback
- **Professional UI**: polished notification experience
- **Scalability preview**: Demonstrate foundation for full notification system

## Technical Considerations

### Performance
- Limit notification history to last 50 items
- Lazy load notification details
- Debounce rapid notification updates

### Accessibility
- Proper ARIA labels on notification components
- Keyboard navigation support
- Screen reader announcements for new notifications

### Mobile Responsiveness
- Responsive notification panel sizing
- Touch-friendly interaction targets
- Appropriate toast positioning

## Future Enhancement Path

### Phase 2: Web Push Integration
```typescript
// Service Worker registration for real browser notifications
if ('serviceWorker' in navigator && 'PushManager' in window) {
  // Register service worker
  // Request notification permissions
  // Subscribe to push notifications
  // Demonstrate real browser notification delivery
}
```

### Integration Points for Full System
- Database schema integration (follows architecture doc)
- Real-time subscription setup (Supabase real-time)
- Authentication integration (when user system added)
- Email/SMS fallback demonstration

## Implementation Checklist

- [ ] Create notification types and interfaces
- [ ] Implement NotificationService with demo data
- [ ] Build NotificationBell component
- [ ] Build NotificationPanel component
- [ ] Build NotificationItem component
- [ ] Create ToastNotifications component
- [ ] Integrate with AppHeader
- [ ] Add client-specific demo scenarios
- [ ] Test notification flow with client switching
- [ ] Add accessibility features
- [ ] Test responsive design
- [ ] Create demo presentation flow

This implementation provides a compelling demonstration of notification capabilities while maintaining the client-only architecture of the flows-admin-demo application.