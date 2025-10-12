/**
 * Transport Layer Types
 *
 * Defines the minimal contract for communication between client and storage layer.
 * Implementation can be:
 * - Browser: MessageChannel to Service Worker
 * - Native: JavaScript bridge to Swift/Kotlin
 *
 * @see /docs/CORE_ARCHITECTURE_CONTRACTS.md
 */

/**
 * Minimal transport interface
 * Implementations must provide request/response communication
 */
export interface Transport {
  /**
   * Send a message and wait for response
   * @param message - The message to send
   * @returns Promise resolving to response
   */
  send(message: unknown): Promise<unknown>;

  /**
   * Optional: Subscribe to a channel for broadcasts
   * @param channel - Channel name to subscribe to
   * @param handler - Callback for received messages
   * @returns Unsubscribe function
   */
  subscribe?(channel: string, handler: (message: unknown) => void): () => void;
}

/**
 * Environment detection
 */
export interface Environment {
  type: 'browser' | 'native-webview';
  capabilities: {
    serviceWorker: boolean;
    indexedDB: boolean;
    broadcastChannel: boolean;
    nativeBridge: boolean;
    sqliteAccess: boolean;
  };
}

/**
 * Transport message envelope
 */
export interface TransportMessage<T = unknown> {
  id: string; // Request ID for matching responses
  type: 'request' | 'response' | 'broadcast';
  procedure?: string; // e.g., 'query.tasks' or 'mutation.updateTask'
  payload: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/**
 * Browser-specific transport (MessageChannel)
 */
export interface BrowserTransport extends Transport {
  channel: MessageChannel;
  worker: ServiceWorker;
}

/**
 * Native-specific transport (JavaScript bridge)
 */
export interface NativeTransport extends Transport {
  platform: 'ios' | 'android';
  bridgeName: string;
}

/**
 * Transport factory function signature
 */
export type CreateTransport = (env: Environment) => Transport;

/**
 * Detect current environment
 */
export function detectEnvironment(): Environment {
  // Check for native webview user agent
  const isNative = /FlowsApp/i.test(navigator.userAgent);

  if (isNative) {
    return {
      type: 'native-webview',
      capabilities: {
        serviceWorker: false,
        indexedDB: false,
        broadcastChannel: false,
        nativeBridge: true,
        sqliteAccess: true,
      },
    };
  }

  return {
    type: 'browser',
    capabilities: {
      serviceWorker: 'serviceWorker' in navigator,
      indexedDB: 'indexedDB' in window,
      broadcastChannel: 'BroadcastChannel' in window,
      nativeBridge: false,
      sqliteAccess: false,
    },
  };
}
