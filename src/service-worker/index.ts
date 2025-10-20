/// <reference lib="webworker" />
/**
 * Flows Service Worker
 *
 * Manages IndexedDB for local data storage and synchronization.
 * Provides RPC interface for client applications.
 */

import type { TransportMessage } from '../types';
import { initDB, seedDatabase, handleRPC } from './index-db';
import { initLogger, logAuthEvent } from './logger';

const SW_VERSION = '1.0.0';

/**
 * Message handler for RPC calls
 */
self.addEventListener('message', async (event: ExtendableMessageEvent) => {
	const messageData = event.data;

	// Handle debug logging messages (different format than RPC)
	if (messageData.type === 'LOG_AUTH_EVENT') {
		const { event: eventName, data, url, tabId } = messageData;
		logAuthEvent(eventName, data, url, tabId);
		return;
	}

	// Handle RPC messages
	const { id, type, procedure, payload } = messageData as TransportMessage;

	if (type === 'INIT_CONFIG') {
		// Handle configuration
		console.log('[SW] Configuration received:', payload);
		return;
	}

	if (type !== 'request' || !procedure) {
		return;
	}

	try {
		const result = await handleRPC(procedure, payload);

		event.ports[0]?.postMessage({
			id,
			type: 'response',
			payload: result
		});
	} catch (error) {
		event.ports[0]?.postMessage({
			id,
			type: 'response',
			payload: null,
			error: {
				code: 'RPC_ERROR',
				message: error instanceof Error ? error.message : 'Unknown error'
			}
		});
	}
});

/**
 * Service Worker lifecycle
 */
self.addEventListener('install', (event) => {
	console.log(`[SW] Installing version ${SW_VERSION}`);
	(event as ExtendableEvent).waitUntil(
		Promise.all([
			initDB().then(() => seedDatabase()),
			initLogger()
		])
		.then(() => {
			logAuthEvent('SW_INSTALL', { version: SW_VERSION });
			return (self as any).skipWaiting();
		})
	);
});

self.addEventListener('activate', (event) => {
	console.log(`[SW] Activating version ${SW_VERSION}`);
	(event as ExtendableEvent).waitUntil(
		(self as any).clients.claim().then(() => {
			logAuthEvent('SW_ACTIVATE', { version: SW_VERSION });
		})
	);
});

console.log(`[SW] Flows Service Worker ${SW_VERSION} loaded`);
