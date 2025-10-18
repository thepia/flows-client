import { supabaseClientStore } from '$lib/contexts/supabase-context';
import { get } from 'svelte/store';

// Get current Supabase client from store (returns null if not available)
function getCurrentSupabaseClient(): SupabaseClient | null {
  return get(supabaseClientStore);
}

// Get current Supabase client from store (throws if not available)
function getRequiredSupabaseClient(): SupabaseClient {
  const client = get(supabaseClientStore);
  if (!client) {
    throw new Error('Authentication required - please sign in to access notifications');
  }
  return client;
}
import type {
  NotificationService as INotificationService,
  Notification,
  NotificationDemoConfig,
  NotificationEvent,
  NotificationFilter,
  NotificationPriority,
  NotificationStakeholder,
  NotificationStats,
  NotificationStatus,
  NotificationType,
} from '$lib/types/notifications';

class NotificationService implements INotificationService {
  private notifications: Notification[] = [];
  private subscribers: ((notification: Notification) => void)[] = [];
  private statsSubscribers: ((stats: NotificationStats) => void)[] = [];
  private realtimeChannel: any = null;

  constructor() {
    // Initialize realtime when Supabase client becomes available
    this.initializeRealtimeWhenReady();
  }

  private initializeRealtimeWhenReady() {
    // Wait for client to become available using store subscription
    const unsubscribe = supabaseClientStore.subscribe((client) => {
      if (client) {
        console.log('✅ NotificationService: Supabase client available, initializing realtime');
        this.initializeRealtime(client);
        unsubscribe();
      } else {
        console.log('⏳ NotificationService: Waiting for Supabase client...');
      }
    });
  }

  private initializeRealtime(supabase: any) {
    if (!supabase) {
      console.warn('⚠️ NotificationService: Supabase client not available, skipping realtime initialization');
      return;
    }

    // Subscribe to notification changes via Supabase realtime
    this.realtimeChannel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'api',
          table: 'notifications',
        },
        (payload) => {
          this.handleRealtimeEvent(payload);
        }
      )
      .subscribe();
  }

  private handleRealtimeEvent(payload: any) {
    // Handle real-time database changes
    console.log('Notification real-time event:', payload);

    switch (payload.eventType) {
      case 'INSERT':
        this.notifySubscribers(this.mapDbToNotification(payload.new));
        break;
      case 'UPDATE':
        this.updateLocalNotification(this.mapDbToNotification(payload.new));
        break;
      case 'DELETE':
        this.removeLocalNotification(payload.old.id);
        break;
    }

    this.notifyStatsSubscribers();
  }

  private mapDbToNotification(dbRecord: any): Notification {
    // Map database record to Notification interface
    return {
      id: dbRecord.id,
      type: dbRecord.type,
      title: dbRecord.title,
      message: dbRecord.message,
      priority: dbRecord.priority,
      status: dbRecord.status,
      channels: dbRecord.channels || ['in_app'],
      from: JSON.parse(dbRecord.from_stakeholder || '{}'),
      to: JSON.parse(dbRecord.to_stakeholders || '[]'),
      createdAt: dbRecord.created_at,
      scheduledFor: dbRecord.scheduled_for,
      readAt: dbRecord.read_at,
      archivedAt: dbRecord.archived_at,
      expiresAt: dbRecord.expires_at,
      actions: JSON.parse(dbRecord.actions || '[]'),
      metadata: JSON.parse(dbRecord.metadata || '{}'),
      clientId: dbRecord.client_id,
      applicationId: dbRecord.application_id,
    };
  }

  async getNotifications(filter?: NotificationFilter): Promise<Notification[]> {
    try {
      const supabase = getCurrentSupabaseClient();
      if (!supabase) {
        // Return empty array if not authenticated yet
        return [];
      }

      let query = supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });

      // Apply filters
      if (filter) {
        if (filter.status) {
          query = query.in('status', filter.status);
        }
        if (filter.type) {
          query = query.in('type', filter.type);
        }
        if (filter.priority) {
          query = query.in('priority', filter.priority);
        }
        if (filter.clientId) {
          query = query.eq('client_id', filter.clientId);
        }
        if (filter.applicationId) {
          query = query.eq('application_id', filter.applicationId);
        }
        if (filter.dateRange) {
          query = query
            .gte('created_at', filter.dateRange.start)
            .lte('created_at', filter.dateRange.end);
        }
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching notifications:', error);
        return this.getFallbackNotifications(filter);
      }

      const notifications = data?.map(this.mapDbToNotification) || [];
      this.notifications = notifications;
      return notifications;
    } catch (error) {
      console.error('Error in getNotifications:', error);
      return this.getFallbackNotifications(filter);
    }
  }

  private getFallbackNotifications(filter?: NotificationFilter): Notification[] {
    // Return demo notifications if database is not available
    return this.notifications.filter((notification) => {
      if (!filter) return true;

      if (filter.status && !filter.status.includes(notification.status)) return false;
      if (filter.type && !filter.type.includes(notification.type)) return false;
      if (filter.priority && !filter.priority.includes(notification.priority)) return false;
      if (filter.clientId && notification.clientId !== filter.clientId) return false;
      if (filter.applicationId && notification.applicationId !== filter.applicationId) return false;

      return true;
    });
  }

  async getNotification(id: string): Promise<Notification | null> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) {
        console.error('Error fetching notification:', error);
        return this.notifications.find((n) => n.id === id) || null;
      }

      return this.mapDbToNotification(data);
    } catch (error) {
      console.error('Error in getNotification:', error);
      return this.notifications.find((n) => n.id === id) || null;
    }
  }

  async markAsRead(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({
          status: 'read',
          read_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) {
        console.error('Error marking notification as read:', error);
      }

      // Update local state
      this.updateLocalNotificationStatus(id, 'read');
    } catch (error) {
      console.error('Error in markAsRead:', error);
      this.updateLocalNotificationStatus(id, 'read');
    }
  }

  async markAsUnread(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({
          status: 'unread',
          read_at: null,
        })
        .eq('id', id);

      if (error) {
        console.error('Error marking notification as unread:', error);
      }

      this.updateLocalNotificationStatus(id, 'unread');
    } catch (error) {
      console.error('Error in markAsUnread:', error);
      this.updateLocalNotificationStatus(id, 'unread');
    }
  }

  async archiveNotification(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({
          status: 'archived',
          archived_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) {
        console.error('Error archiving notification:', error);
      }

      this.updateLocalNotificationStatus(id, 'archived');
    } catch (error) {
      console.error('Error in archiveNotification:', error);
      this.updateLocalNotificationStatus(id, 'archived');
    }
  }

  async dismissNotification(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ status: 'dismissed' })
        .eq('id', id);

      if (error) {
        console.error('Error dismissing notification:', error);
      }

      this.updateLocalNotificationStatus(id, 'dismissed');
    } catch (error) {
      console.error('Error in dismissNotification:', error);
      this.updateLocalNotificationStatus(id, 'dismissed');
    }
  }

  async markAllAsRead(filter?: NotificationFilter): Promise<void> {
    const notifications = await this.getNotifications(filter);
    const unreadIds = notifications.filter((n) => n.status === 'unread').map((n) => n.id);

    await Promise.all(unreadIds.map((id) => this.markAsRead(id)));
  }

  async archiveAll(filter?: NotificationFilter): Promise<void> {
    const notifications = await this.getNotifications(filter);
    const activeIds = notifications.filter((n) => n.status !== 'archived').map((n) => n.id);

    await Promise.all(activeIds.map((id) => this.archiveNotification(id)));
  }

  async getStats(filter?: NotificationFilter): Promise<NotificationStats> {
    const notifications = await this.getNotifications(filter);

    const stats: NotificationStats = {
      total: notifications.length,
      unread: notifications.filter((n) => n.status === 'unread').length,
      byType: {} as Record<NotificationType, number>,
      byPriority: {} as Record<NotificationPriority, number>,
      byStatus: {} as Record<NotificationStatus, number>,
    };

    // Count by type
    notifications.forEach((notification) => {
      stats.byType[notification.type] = (stats.byType[notification.type] || 0) + 1;
      stats.byPriority[notification.priority] = (stats.byPriority[notification.priority] || 0) + 1;
      stats.byStatus[notification.status] = (stats.byStatus[notification.status] || 0) + 1;
    });

    return stats;
  }

  subscribe(callback: (notification: Notification) => void): () => void {
    this.subscribers.push(callback);
    return () => {
      const index = this.subscribers.indexOf(callback);
      if (index > -1) {
        this.subscribers.splice(index, 1);
      }
    };
  }

  subscribeToStats(callback: (stats: NotificationStats) => void): () => void {
    this.statsSubscribers.push(callback);
    return () => {
      const index = this.statsSubscribers.indexOf(callback);
      if (index > -1) {
        this.statsSubscribers.splice(index, 1);
      }
    };
  }

  async generateDemoNotifications(count: number = 25): Promise<Notification[]> {
    const demoNotifications = this.createDemoNotifications(count);

    try {
      // Try to insert into database
      const dbRecords = demoNotifications.map((notification) => ({
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        priority: notification.priority,
        status: notification.status,
        channels: notification.channels,
        from_stakeholder: JSON.stringify(notification.from),
        to_stakeholders: JSON.stringify(notification.to),
        created_at: notification.createdAt,
        scheduled_for: notification.scheduledFor,
        expires_at: notification.expiresAt,
        actions: JSON.stringify(notification.actions || []),
        metadata: JSON.stringify(notification.metadata || {}),
        client_id: notification.clientId,
        application_id: notification.applicationId,
      }));

      const { error } = await supabase.from('notifications').upsert(dbRecords);

      if (error) {
        console.error('Error inserting demo notifications:', error);
      }
    } catch (error) {
      console.error('Error in generateDemoNotifications:', error);
    }

    // Always update local state
    this.notifications = [...this.notifications, ...demoNotifications];
    this.notifyStatsSubscribers();

    return demoNotifications;
  }

  async clearAllNotifications(): Promise<void> {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (error) {
        console.error('Error clearing notifications:', error);
      }
    } catch (error) {
      console.error('Error in clearAllNotifications:', error);
    }

    this.notifications = [];
    this.notifyStatsSubscribers();
  }

  private createDemoNotifications(count: number): Notification[] {
    const stakeholders = this.getDemoStakeholders();
    const notifications: Notification[] = [];
    const now = new Date();

    for (let i = 0; i < count; i++) {
      const createdAt = new Date(now.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000); // Random within last week
      const notification = this.generateRandomNotification(stakeholders, createdAt);
      notifications.push(notification);
    }

    return notifications.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  private getDemoStakeholders(): NotificationStakeholder[] {
    return [
      {
        id: 'system',
        type: 'system',
        name: 'Flows System',
        email: 'system@flows.thepia.net',
        avatar: '🤖',
      },
      {
        id: 'hr-manager',
        type: 'hr',
        name: 'Sarah Johnson',
        email: 'sarah.johnson@hyggehvidlog.dk',
        avatar: '👩‍💼',
      },
      {
        id: 'direct-manager',
        type: 'manager',
        name: 'Lars Nielsen',
        email: 'lars.nielsen@hyggehvidlog.dk',
        avatar: '👨‍💼',
      },
      {
        id: 'admin',
        type: 'admin',
        name: 'Admin User',
        email: 'admin@hyggehvidlog.dk',
        avatar: '⚙️',
      },
    ];
  }

  private generateRandomNotification(
    stakeholders: NotificationStakeholder[],
    createdAt: Date
  ): Notification {
    const scenarios = [
      {
        type: 'onboarding_reminder' as NotificationType,
        title: 'Complete your onboarding checklist',
        message:
          'You have 3 pending items in your onboarding checklist. Please complete them by end of week.',
        priority: 'medium' as NotificationPriority,
        from: stakeholders.find((s) => s.type === 'hr')!,
        actions: [
          {
            id: 'view-checklist',
            label: 'View Checklist',
            type: 'primary' as const,
            href: '/onboarding',
          },
          { id: 'remind-later', label: 'Remind Later', type: 'secondary' as const },
        ],
      },
      {
        type: 'document_review' as NotificationType,
        title: 'Document ready for review',
        message: 'Employee handbook has been uploaded and is ready for your review and approval.',
        priority: 'high' as NotificationPriority,
        from: stakeholders.find((s) => s.type === 'manager')!,
        actions: [
          {
            id: 'review-doc',
            label: 'Review Document',
            type: 'primary' as const,
            href: '/documents',
          },
          { id: 'delegate', label: 'Delegate Review', type: 'secondary' as const },
        ],
      },
      {
        type: 'task_assignment' as NotificationType,
        title: 'New task assigned to you',
        message: 'Setup workspace and development environment for new team member.',
        priority: 'medium' as NotificationPriority,
        from: stakeholders.find((s) => s.type === 'manager')!,
        actions: [
          { id: 'view-task', label: 'View Task', type: 'primary' as const, href: '/tasks' },
          { id: 'update-status', label: 'Update Status', type: 'secondary' as const },
        ],
      },
      {
        type: 'deadline_reminder' as NotificationType,
        title: 'Deadline approaching',
        message:
          'Your probation review is due in 3 days. Please schedule a meeting with your manager.',
        priority: 'high' as NotificationPriority,
        from: stakeholders.find((s) => s.type === 'system')!,
        actions: [
          { id: 'schedule-meeting', label: 'Schedule Meeting', type: 'primary' as const },
          { id: 'extend-deadline', label: 'Request Extension', type: 'secondary' as const },
        ],
      },
      {
        type: 'system_alert' as NotificationType,
        title: 'System maintenance scheduled',
        message: 'The system will be unavailable for maintenance on Saturday from 2-4 AM.',
        priority: 'low' as NotificationPriority,
        from: stakeholders.find((s) => s.type === 'system')!,
        actions: [{ id: 'view-schedule', label: 'View Schedule', type: 'secondary' as const }],
      },
    ];

    const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];
    const isRead = Math.random() > 0.6; // 40% chance of being read

    return {
      id: `demo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: scenario.type,
      title: scenario.title,
      message: scenario.message,
      priority: scenario.priority,
      status: isRead ? 'read' : 'unread',
      channels: ['in_app'],
      from: scenario.from,
      to: [
        {
          id: 'current-user',
          type: 'employee' as const,
          name: 'Current User',
          email: 'user@hyggehvidlog.dk',
          avatar: '👤',
        },
      ],
      createdAt: createdAt.toISOString(),
      readAt: isRead
        ? new Date(createdAt.getTime() + Math.random() * 24 * 60 * 60 * 1000).toISOString()
        : undefined,
      expiresAt: new Date(createdAt.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      actions: scenario.actions,
      metadata: {
        processId: `process-${Math.floor(Math.random() * 1000)}`,
        personId: `person-${Math.floor(Math.random() * 100)}`,
      },
      clientId: 'hygge-hvidlog',
      applicationId: 'onboarding',
    };
  }

  private updateLocalNotificationStatus(id: string, status: NotificationStatus) {
    const notification = this.notifications.find((n) => n.id === id);
    if (notification) {
      notification.status = status;
      if (status === 'read') {
        notification.readAt = new Date().toISOString();
      } else if (status === 'archived') {
        notification.archivedAt = new Date().toISOString();
      }
    }
  }

  private updateLocalNotification(notification: Notification) {
    const index = this.notifications.findIndex((n) => n.id === notification.id);
    if (index > -1) {
      this.notifications[index] = notification;
    } else {
      this.notifications.unshift(notification);
    }
  }

  private removeLocalNotification(id: string) {
    const index = this.notifications.findIndex((n) => n.id === id);
    if (index > -1) {
      this.notifications.splice(index, 1);
    }
  }

  private notifySubscribers(notification?: Notification) {
    if (notification) {
      this.subscribers.forEach((callback) => callback(notification));
    }
  }

  private async notifyStatsSubscribers() {
    const stats = await this.getStats();
    this.statsSubscribers.forEach((callback) => callback(stats));
  }

  // Cleanup
  destroy() {
    if (this.realtimeChannel) {
      supabase.removeChannel(this.realtimeChannel);
    }
    this.subscribers = [];
    this.statsSubscribers = [];
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
