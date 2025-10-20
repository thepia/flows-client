/**
 * Debug script to check authentication and IndexedDB state
 * Run this in the browser console to diagnose issues
 */

console.log('🔍 Starting authentication debug...');

// Check if service worker is registered
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    console.log('📋 Service Worker registrations:', registrations.length);
    registrations.forEach((reg, i) => {
      console.log(`  ${i + 1}. Scope: ${reg.scope}, State: ${reg.active?.state}`);
    });
  });
} else {
  console.log('❌ Service Worker not supported');
}

// Check IndexedDB
function checkIndexedDB() {
  console.log('🗄️ Checking IndexedDB...');
  
  const request = indexedDB.open('flows_db', 1);
  
  request.onsuccess = (event) => {
    const db = event.target.result;
    console.log('✅ IndexedDB opened successfully');
    console.log('📊 Object stores:', Array.from(db.objectStoreNames));
    
    // Check auth_sessions table
    if (db.objectStoreNames.contains('auth_sessions')) {
      const transaction = db.transaction(['auth_sessions'], 'readonly');
      const store = transaction.objectStore('auth_sessions');
      const getAllRequest = store.getAll();
      
      getAllRequest.onsuccess = () => {
        const sessions = getAllRequest.result;
        console.log(`🔐 Found ${sessions.length} auth sessions:`, sessions);
        
        if (sessions.length > 0) {
          const session = sessions[0];
          console.log('📋 Session details:', {
            userId: session.userId,
            email: session.email,
            hasAccessToken: !!session.accessToken,
            hasSupabaseToken: !!session.supabaseToken,
            accessTokenPreview: session.accessToken?.substring(0, 20) + '...',
            supabaseTokenPreview: session.supabaseToken?.substring(0, 20) + '...',
            expiresAt: new Date(session.expiresAt).toISOString(),
            supabaseExpiresAt: session.supabaseExpiresAt ? new Date(session.supabaseExpiresAt).toISOString() : 'none',
            savedAt: session.savedAt
          });
        }
      };
    } else {
      console.log('❌ auth_sessions table not found');
    }
    
    db.close();
  };
  
  request.onerror = () => {
    console.error('❌ Failed to open IndexedDB:', request.error);
  };
}

// Check auth store state (if available)
function checkAuthStore() {
  console.log('🔐 Checking auth store...');
  
  // Try to get auth store from window (if exposed for debugging)
  if (window.authStore) {
    const state = window.authStore.getState();
    console.log('📊 Auth store state:', {
      state: state.state,
      isAuthenticated: state.isAuthenticated,
      user: state.user,
      hasAccessToken: !!state.access_token,
      hasSupabaseToken: !!state.supabase_token,
      accessTokenPreview: state.access_token?.substring(0, 20) + '...',
      supabaseTokenPreview: state.supabase_token?.substring(0, 20) + '...',
      expiresAt: state.expires_at ? new Date(state.expires_at).toISOString() : 'none',
      supabaseExpiresAt: state.supabase_expires_at ? new Date(state.supabase_expires_at).toISOString() : 'none'
    });
  } else {
    console.log('❌ Auth store not found on window object');
  }
}

// Function to view persistent debug logs from service worker
window.viewDebugLogs = async function() {
  console.log('🔍 === PERSISTENT DEBUG LOGS FROM SERVICE WORKER ===');

  if (!('serviceWorker' in navigator)) {
    console.error('❌ Service Worker not supported');
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    if (!registration.active) {
      console.error('❌ No active service worker');
      return;
    }

    // Request logs from service worker via RPC
    const response = await new Promise((resolve, reject) => {
      const channel = new MessageChannel();
      channel.port1.onmessage = (event) => {
        if (event.data.error) {
          reject(new Error(event.data.error));
        } else {
          resolve(event.data.result);
        }
      };

      registration.active.postMessage({
        id: Date.now(),
        type: 'request',
        procedure: 'debug.getRecentLogs',
        payload: { limit: 100 }
      }, [channel.port2]);
    });

    const logs = response;
    if (!logs || logs.length === 0) {
      console.log('No debug logs found in service worker');
      return;
    }

    console.log(`Found ${logs.length} debug log entries:`);
    logs.forEach((log, index) => {
      console.log(`\n[${index + 1}] ${log.timestamp} - ${log.event}`);
      console.log('Data:', log.data);
      console.log('URL:', log.url);
      if (log.tabId) console.log('Tab ID:', log.tabId);
    });

    // Look for "already exchanged" patterns
    const alreadyExchangedLogs = logs.filter(log =>
      log.event.includes('ALREADY_EXCHANGED') ||
      log.data?.errorMessage?.includes('already exchanged')
    );

    if (alreadyExchangedLogs.length > 0) {
      console.log('\n🚨 === ALREADY EXCHANGED ERRORS ===');
      alreadyExchangedLogs.forEach((log, index) => {
        console.log(`\n[${index + 1}] ${log.timestamp}`);
        console.log('Event:', log.event);
        console.log('Data:', log.data);
        if (log.tabId) console.log('Tab ID:', log.tabId);
      });
    }

    return logs;
  } catch (error) {
    console.error('Failed to read debug logs from service worker:', error);
  }
};

// Function to clear debug logs in service worker
window.clearDebugLogs = async function() {
  console.log('🗑️ Clearing debug logs in service worker...');

  if (!('serviceWorker' in navigator)) {
    console.error('❌ Service Worker not supported');
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    if (!registration.active) {
      console.error('❌ No active service worker');
      return;
    }

    // Clear logs via service worker RPC
    await new Promise((resolve, reject) => {
      const channel = new MessageChannel();
      channel.port1.onmessage = (event) => {
        if (event.data.error) {
          reject(new Error(event.data.error));
        } else {
          resolve(event.data.result);
        }
      };

      registration.active.postMessage({
        id: Date.now(),
        type: 'request',
        procedure: 'debug.clearDebugLogs',
        payload: {}
      }, [channel.port2]);
    });

    console.log('✅ Debug logs cleared from service worker');
  } catch (error) {
    console.error('Failed to clear debug logs:', error);
  }
};

// Function to export debug logs from service worker
window.exportDebugLogs = async function() {
  console.log('📤 Exporting debug logs from service worker...');

  if (!('serviceWorker' in navigator)) {
    console.error('❌ Service Worker not supported');
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    if (!registration.active) {
      console.error('❌ No active service worker');
      return;
    }

    // Get all logs from service worker
    const logs = await new Promise((resolve, reject) => {
      const channel = new MessageChannel();
      channel.port1.onmessage = (event) => {
        if (event.data.error) {
          reject(new Error(event.data.error));
        } else {
          resolve(event.data.result);
        }
      };

      registration.active.postMessage({
        id: Date.now(),
        type: 'request',
        procedure: 'debug.exportLogs',
        payload: {}
      }, [channel.port2]);
    });

    if (!logs || logs.length === 0) {
      console.log('No debug logs to export');
      return;
    }

    const dataStr = JSON.stringify(logs, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `flows-auth-debug-logs-${new Date().toISOString().slice(0, 19)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    console.log(`✅ Debug logs exported (${logs.length} entries)`);
  } catch (error) {
    console.error('Failed to export debug logs:', error);
  }
};

// Run all checks
setTimeout(() => {
  checkIndexedDB();
  checkAuthStore();
}, 1000);

console.log('🔍 Debug script loaded. Checks will run in 1 second...');
console.log('📋 Available functions:');
console.log('- checkIndexedDB() - Check IndexedDB data');
console.log('- checkAuthStore() - Check auth store state');
console.log('- viewDebugLogs() - View persistent debug logs');
console.log('- clearDebugLogs() - Clear debug logs');
console.log('- exportDebugLogs() - Export debug logs to file');
