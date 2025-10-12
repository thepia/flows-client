/**
 * Type declarations for service-worker-mock
 * This package doesn't ship with TypeScript declarations
 */

declare module 'service-worker-mock' {
  interface ServiceWorkerMockEnv {
    self: ServiceWorkerGlobalScope;
    caches: CacheStorage;
    clients: Clients;
    registration: ServiceWorkerRegistration;
    skipWaiting: () => Promise<void>;
    trigger: (eventType: string, ...args: any[]) => void;
    ExtendableMessageEvent: new (...args: any[]) => ExtendableMessageEvent;
  }

  export default function makeServiceWorkerEnv(): ServiceWorkerMockEnv;
}
