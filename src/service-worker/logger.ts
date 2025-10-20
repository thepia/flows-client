/**
 * Persistent debug logging for the service worker
 * Stores auth-related events in IndexedDB "flows-tmp" database
 */

export interface DebugLogEntry {
  id?: number;
  timestamp: string;
  event: string;
  data: any;
  url: string;
  tabId?: string;
}

// Keep reference to the logger database
let loggerDB: IDBDatabase | null = null;

/**
 * Initialize the logger database (separate from main flows_db)
 */
export async function initLogger(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('flows-tmp', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      loggerDB = request.result;
      resolve();
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create auth-log table for debug logging
      if (!db.objectStoreNames.contains('auth-log')) {
        const logStore = db.createObjectStore('auth-log', { keyPath: 'id', autoIncrement: true });
        logStore.createIndex('timestamp', 'timestamp', { unique: false });
        logStore.createIndex('event', 'event', { unique: false });
        logStore.createIndex('url', 'url', { unique: false });
      }
    };
  });
}

/**
 * Log an auth-related event to persistent storage
 */
export async function logAuthEvent(event: string, data: any, url?: string, tabId?: string): Promise<void> {
  // Initialize logger DB if not already done
  if (!loggerDB) {
    try {
      await initLogger();
    } catch (error) {
      console.warn('[SW Logger] Failed to initialize database, skipping log:', error);
      return;
    }
  }

  if (!loggerDB) {
    console.warn('[SW Logger] Database not available, skipping log');
    return;
  }

  const logEntry: DebugLogEntry = {
    timestamp: new Date().toISOString(),
    event,
    data,
    url: url || 'service-worker',
    tabId
  };

  return new Promise((resolve, reject) => {
    const transaction = loggerDB!.transaction(['auth-log'], 'readwrite');
    const store = transaction.objectStore('auth-log');

    const request = store.add(logEntry);

    request.onsuccess = () => {
      console.log(`[SW Logger] ${event}:`, data);
      resolve();
    };

    request.onerror = () => {
      console.error('[SW Logger] Failed to write log:', request.error);
      reject(request.error);
    };
  });
}

/**
 * Get recent debug logs (last N entries)
 */
export async function getRecentLogs(limit: number = 50): Promise<DebugLogEntry[]> {
  if (!loggerDB) {
    await initLogger();
  }

  if (!loggerDB) {
    throw new Error('Logger database not available');
  }

  return new Promise((resolve, reject) => {
    const transaction = loggerDB!.transaction(['auth-log'], 'readonly');
    const store = transaction.objectStore('auth-log');
    const index = store.index('timestamp');

    // Get all logs in reverse chronological order
    const request = index.openCursor(null, 'prev');
    const logs: DebugLogEntry[] = [];
    let count = 0;

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result;
      if (cursor && count < limit) {
        logs.push(cursor.value);
        count++;
        cursor.continue();
      } else {
        resolve(logs);
      }
    };

    request.onerror = () => reject(request.error);
  });
}

/**
 * Get logs by event type
 */
export async function getLogsByEvent(eventType: string): Promise<DebugLogEntry[]> {
  if (!loggerDB) {
    await initLogger();
  }

  if (!loggerDB) {
    throw new Error('Logger database not available');
  }

  return new Promise((resolve, reject) => {
    const transaction = loggerDB!.transaction(['auth-log'], 'readonly');
    const store = transaction.objectStore('auth-log');
    const index = store.index('event');

    const request = index.getAll(eventType);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Clear old debug logs (keep only last N entries)
 */
export async function cleanupOldLogs(keepCount: number = 100): Promise<void> {
  if (!loggerDB) {
    await initLogger();
  }

  if (!loggerDB) {
    throw new Error('Logger database not available');
  }

  return new Promise((resolve, reject) => {
    const transaction = loggerDB!.transaction(['auth-log'], 'readwrite');
    const store = transaction.objectStore('auth-log');
    const index = store.index('timestamp');

    // Count total logs
    const countRequest = store.count();

    countRequest.onsuccess = () => {
      const totalCount = countRequest.result;

      if (totalCount <= keepCount) {
        resolve(); // Nothing to clean
        return;
      }

      // Get oldest logs to delete
      const deleteCount = totalCount - keepCount;
      const request = index.openCursor();
      let deletedCount = 0;

      request.onsuccess = (event: any) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor && deletedCount < deleteCount) {
          cursor.delete();
          deletedCount++;
          cursor.continue();
        } else {
          console.log(`[SW Logger] Cleaned up ${deletedCount} old log entries`);
          resolve();
        }
      };

      request.onerror = () => reject(request.error);
    };

    countRequest.onerror = () => reject(countRequest.error);
  });
}

/**
 * Export all logs as JSON
 */
export async function exportLogs(): Promise<DebugLogEntry[]> {
  if (!loggerDB) {
    await initLogger();
  }

  if (!loggerDB) {
    throw new Error('Logger database not available');
  }

  return new Promise((resolve, reject) => {
    const transaction = loggerDB!.transaction(['auth-log'], 'readonly');
    const store = transaction.objectStore('auth-log');

    const request = store.getAll();

    request.onsuccess = () => {
      const logs = request.result;
      // Sort by timestamp
      logs.sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      resolve(logs);
    };

    request.onerror = () => reject(request.error);
  });
}

/**
 * Log session save events
 */
export function logSessionSave(sessionData: any) {
  logAuthEvent('SESSION_SAVE', {
    userId: sessionData.userId,
    refreshTokenPrefix: sessionData.refreshToken ? `${sessionData.refreshToken.substring(0, 8)}...` : 'none',
    expiresAt: new Date(sessionData.expiresAt).toISOString(),
    hasSupabaseToken: !!sessionData.supabaseToken
  });
}

/**
 * Log session load events
 */
export function logSessionLoad(sessionData: any | null) {
  if (!sessionData) {
    logAuthEvent('SESSION_LOAD_EMPTY', {});
    return;
  }

  logAuthEvent('SESSION_LOAD', {
    userId: sessionData.userId,
    refreshTokenPrefix: sessionData.refreshToken ? `${sessionData.refreshToken.substring(0, 8)}...` : 'none',
    expiresAt: new Date(sessionData.expiresAt).toISOString(),
    isExpired: sessionData.expiresAt <= Date.now(),
    hasSupabaseToken: !!sessionData.supabaseToken
  });
}

/**
 * Log refresh token events from main thread
 */
export function logRefreshTokenEvent(event: string, data: any, url?: string, tabId?: string) {
  logAuthEvent(`REFRESH_${event}`, data, url, tabId);
}
