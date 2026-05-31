/**
 * Flows DB Client
 *
 * Type-safe client for communicating with the Flows Service Worker or Native App.
 * Automatically detects environment and uses appropriate transport:
 * - Native App (iOS/macOS): WebKit message handlers via window.webkit.messageHandlers.thepia
 * - Browser: Service Worker with MessageChannel for request/response RPC pattern
 */

// TYPES ONLY imports from flows-auth - no runtime code
import type { SessionPersistence, SessionData, UserData } from '@thepia/flows-auth';

import type {
	FlowsDBProcedures,
	ProcedureInput,
	ProcedureOutput,
	TransportMessage,
	WebAppStatePayload
} from '../types/index';

export interface FlowsClientConfig {
	/**
	 * Path to the service worker file (browser mode only)
	 * @default '/flows-sw.js'
	 */
	serviceWorkerUrl?: string;

	/**
	 * Service worker scope (browser mode only)
	 * @default '/'
	 */
	scope?: string;

	/**
	 * Whether to log debug messages
	 * @default false
	 */
	debug?: boolean;

	/**
	 * Element (or CSS selector) to observe for content height changes.
	 * Use this to avoid measuring body, which is polluted by min-height and navigation transitions.
	 * @default document.body
	 * @example '#svelte'
	 */
	contentElement?: string | Element;
}

export class FlowsDBClient {
	private registration: ServiceWorkerRegistration | null = null;
	private nativeBridge: NativeAppBridge | null = null;
	private isNativeApp: boolean = false;
	private ready: Promise<void>;
	private config: Required<FlowsClientConfig>;
	private readonly contentElementConfig: string | Element | undefined;
	private heightObserver: ResizeObserver | null = null;
	private heightDebounceTimer: ReturnType<typeof setTimeout> | null = null;
	private lastSentHeight: number | null = null;
	private lastSentTime: number = 0;
	private currentPageHeight: WebAppStatePayload['pageHeight'] | null = null;

	constructor(config: FlowsClientConfig = {}) {
		this.config = {
			serviceWorkerUrl: config.serviceWorkerUrl || '/flows-sw.js',
			scope: config.scope || '/',
			debug: config.debug || false
		};
		this.contentElementConfig = config.contentElement;

		this.ready = this.init();
	}

	private log(...args: unknown[]): void {
		if (this.config.debug) {
			console.log('[FlowsDB]', ...args);
		}
	}

	private async init(): Promise<void> {
		// Check if we're in a browser environment
		if (typeof window === 'undefined' || typeof navigator === 'undefined') {
			// Skip initialization during SSR
			return;
		}

		// DETECTION: Check for ThepiaApp (WebKit message handlers)
		const hasThepiaWebKit =
			typeof window !== 'undefined' &&
			window.webkit?.messageHandlers?.thepia?.postMessage !== undefined;

		if (hasThepiaWebKit) {
			// Running in native ThepiaApp
			this.isNativeApp = true;
			this.nativeBridge = new NativeAppBridge();
			this.log('Running in ThepiaApp - using native message handlers');

			// Ping native app to verify connectivity and get initial context
			try {
				const pingResult = await this.nativeBridge.sendMessage<{ pageHeight?: string }>('ping', undefined);
				if (pingResult?.pageHeight) {
					this.currentPageHeight = pingResult.pageHeight as WebAppStatePayload['pageHeight'];
					this.log('Initial pageHeight from native:', this.currentPageHeight);
				}
				this.log('Successfully connected to native app');
			} catch (error) {
				this.log('Warning: Failed to connect to native app:', error);
				throw new Error('Failed to connect to native app');
			}

			this.startHeightObserver();
			return; // Done - no ServiceWorker needed
		}

		// Not in native app - use ServiceWorker
		if (!('serviceWorker' in navigator)) {
			throw new Error('Service Workers not supported in this browser');
		}

		// Register service worker
		this.log('Running in browser - registering ServiceWorker');
		this.registration = await navigator.serviceWorker.register(
			this.config.serviceWorkerUrl,
			{
				scope: this.config.scope
			}
		);

		// Wait for service worker to be ready
		this.log('Waiting for service worker to be ready...');
		await navigator.serviceWorker.ready;

		this.log('Service Worker registered and ready');
	}

	/**
	 * Call a procedure - automatically uses native bridge or service worker
	 */
	private async call<P extends keyof FlowsDBProcedures>(
		procedure: P,
		input: ProcedureInput<P>
	): Promise<ProcedureOutput<P>> {
		await this.ready;

		// CONDITIONAL: Use native bridge if in ThepiaApp
		if (this.isNativeApp && this.nativeBridge) {
			return await this.nativeBridge.sendMessage(procedure, input);
		}

		// Otherwise use ServiceWorker
		const worker = this.registration?.active || navigator.serviceWorker.controller;
		if (!worker) {
			throw new Error('No active service worker');
		}

		return new Promise((resolve, reject) => {
			const messageChannel = new MessageChannel();
			const requestId = crypto.randomUUID();

			messageChannel.port1.onmessage = (event) => {
				const response: TransportMessage = event.data;

				if (response.error) {
					reject(new Error(response.error.message));
				} else {
					resolve(response.payload as ProcedureOutput<P>);
				}
			};

			const message: TransportMessage = {
				id: requestId,
				type: 'request',
				procedure,
				payload: input
			};

			worker.postMessage(message, [messageChannel.port2]);
		});
	}

	private startHeightObserver(): void {
		if (typeof ResizeObserver === 'undefined' || typeof document === 'undefined') return;

		const target =
			typeof this.contentElementConfig === 'string'
				? document.querySelector(this.contentElementConfig) ?? document.body
				: (this.contentElementConfig ?? document.body);

		this.log('contentHeight observer target:', target);

		this.heightObserver = new ResizeObserver(([entry]) => {
			const height = Math.ceil(entry.contentRect.height);
			if (height === this.lastSentHeight) return;

			if (this.heightDebounceTimer) clearTimeout(this.heightDebounceTimer);

			const elapsed = Date.now() - this.lastSentTime;
			if (elapsed >= 50) {
				this.lastSentHeight = height;
				this.lastSentTime = Date.now();
				this.log('contentHeight send (immediate):', height);
				this.notifyNativeAppState({ contentHeight: height });
			} else {
				// In cooldown — schedule trailing send with remaining time
				this.heightDebounceTimer = setTimeout(() => {
					if (height !== this.lastSentHeight) {
						this.lastSentHeight = height;
						this.lastSentTime = Date.now();
						this.log('contentHeight send (trailing):', height);
						this.notifyNativeAppState({ contentHeight: height });
					}
				}, 50 - elapsed);
			}
		});

		this.heightObserver.observe(target);
	}

	destroy(): void {
		if (this.heightDebounceTimer) clearTimeout(this.heightDebounceTimer);
		this.heightObserver?.disconnect();
		this.nativeBridge?.cleanup();
	}

	/**
	 * Query procedures
	 */
	get query() {
		return {
			journeys: (input: ProcedureInput<'query.journeys'>) =>
				this.call('query.journeys', input),

			journeyById: (input: ProcedureInput<'query.journeyById'>) =>
				this.call('query.journeyById', input),

			tasks: (input: ProcedureInput<'query.tasks'>) => this.call('query.tasks', input),

			tasksByJourney: (input: ProcedureInput<'query.tasksByJourney'>) =>
				this.call('query.tasksByJourney', input),

			evidence: (input: ProcedureInput<'query.evidence'>) =>
				this.call('query.evidence', input),

			evidenceByTask: (input: ProcedureInput<'query.evidenceByTask'>) =>
				this.call('query.evidenceByTask', input)
		};
	}

	/**
	 * Mutation procedures
	 */
	get mutation() {
		return {
			insertJourney: (input: ProcedureInput<'mutation.insertJourney'>) =>
				this.call('mutation.insertJourney', input),

			updateJourney: (input: ProcedureInput<'mutation.updateJourney'>) =>
				this.call('mutation.updateJourney', input),

			deleteJourney: (input: ProcedureInput<'mutation.deleteJourney'>) =>
				this.call('mutation.deleteJourney', input),

			insertTask: (input: ProcedureInput<'mutation.insertTask'>) =>
				this.call('mutation.insertTask', input),

			updateTask: (input: ProcedureInput<'mutation.updateTask'>) =>
				this.call('mutation.updateTask', input)
		};
	}

	/**
	 * Sync procedures
	 */
	get sync() {
		return {
			status: (input: ProcedureInput<'sync.status'>) => this.call('sync.status', input)
		};
	}

	/**
	 * Session management procedures
	 * Implements SessionPersistence interface from @thepia/flows-auth (TYPES ONLY)
	 *
	 * @returns {SessionPersistence} Session persistence adapter that stores data in IndexedDB via Service Worker
	 */
	get session(): SessionPersistence {
		return {
			saveSession: async (session: Partial<SessionData>): Promise<SessionData> => {
				return await this.call('auth.saveSession', session);
			},

			loadSession: async (): Promise<SessionData | null> => {
				return await this.call('auth.getSession', undefined);
			},

			clearSession: async (): Promise<void> => {
				await this.call('auth.clearSession', undefined);
			},

			saveUser: async (user: UserData): Promise<void> => {
				await this.call('auth.saveUser', user);
			},

			getUser: async (userId?: string): Promise<UserData | null> => {
				return await this.call('auth.getUser', userId);
			},

			clearUser: async (userId?: string): Promise<void> => {
				await this.call('auth.clearUser', userId);
			}
		};
	}

	/**
	 * Update user metadata in IndexedDB (targeted update)
	 * Broadcasts update to all tabs via BroadcastChannel
	 */
	async updateUserMetadata(userId: string, metadata: Record<string, unknown>): Promise<void> {
		await this.call('auth.updateUserMetadata', { userId, metadata });
	}

	/**
	 * Patch user metadata via API with atomic server-side merge
	 * Service Worker makes the API request, updates IndexedDB, and broadcasts to all tabs
	 *
	 * @param userId - The user ID
	 * @param patch - The metadata patch to apply
	 * @param appCode - The app code for the API endpoint
	 * @param token - The Bearer token for authentication
	 * @returns The updated metadata from the server
	 */
	async patchMetadata(
		userId: string,
		patch: Record<string, unknown>,
		appCode: string,
		token: string
	): Promise<Record<string, unknown>> {
		return await this.call('auth.patchMetadata', { userId, patch, appCode, token });
	}

	/**
	 * Notify native app of web app state changes
	 * Fire-and-forget notification (no response expected)
	 * Only sends in native app context, silently ignored in browser
	 *
	 * @param payload - The state update payload
	 */
	async notifyNativeAppState(payload: WebAppStatePayload): Promise<void> {
		if (!this.isNativeApp || !this.nativeBridge) {
			this.log('notifyNativeAppState: Not in native app, ignoring');
			return;
		}

		if (payload.pageHeight !== undefined) {
			this.currentPageHeight = payload.pageHeight;
		}

		try {
			await this.nativeBridge.sendMessage('webapp_state', payload);
		} catch (error) {
			// Log but don't throw - state notifications are best-effort
			this.log('notifyNativeAppState: Failed to send state update', error);
		}
	}
}

// Singleton instance
let instance: FlowsDBClient | null = null;

/**
 * Get or create the singleton FlowsDB client instance
 */
export function getFlowsDB(config?: FlowsClientConfig): FlowsDBClient {
	if (!instance) {
		instance = new FlowsDBClient(config);
	}
	return instance;
}

/**
 * Reset the singleton instance (useful for testing)
 */
export function resetFlowsDB(): void {
	instance = null;
}

/**
 * Notify native app of web app state changes
 * Convenience function that uses the singleton instance
 *
 * @param payload - The state update payload
 */
export async function notifyNativeAppState(payload: WebAppStatePayload): Promise<void> {
	return getFlowsDB().notifyNativeAppState(payload);
}

// Export IndexedDB constants for direct database access
export { INDEXEDDB_NAME, INDEXEDDB_VERSION } from '../constants';

/**
 * JWT Utilities
 */

export interface JWTPayload {
	sub?: string;
	email?: string;
	role?: string;
	user_metadata?: Record<string, any>;
	[key: string]: any;
}

/**
 * Safely decode a JWT token payload
 * @param token - The JWT token string
 * @returns The decoded payload or null if invalid
 */
export function decodeJWTPayload(token: string): JWTPayload | null {
	if (!token || typeof token !== 'string') {
		return null;
	}

	try {
		const parts = token.split('.');
		if (parts.length !== 3) {
			return null;
		}

		const payload = parts[1];
		const decoded = atob(payload);
		return JSON.parse(decoded);
	} catch {
		return null;
	}
}

/**
 * Bridge for native app communication via WebKit message handlers
 * Similar pattern to flows-auth native-app-session-adapter
 */
class NativeAppBridge {
	private pendingRequests = new Map<
		string,
		{
			resolve: (value: any) => void;
			reject: (error: Error) => void;
			timeout: ReturnType<typeof setTimeout>;
		}
	>();

	private requestTimeout = 10000; // 10 second timeout

	constructor() {
		// Set up response listener
		if (typeof window !== 'undefined') {
			(window as any).__thepiaResponseHandler = this.handleResponse.bind(this);
		}
	}

	async sendMessage<T>(procedure: string, input: unknown): Promise<T> {
		const requestId = `flowsdb_${procedure}_${Date.now()}_${Math.random().toString(36).substring(7)}`;

		const message = {
			type: 'flowsdb', // Namespace to distinguish from 'auth' messages
			procedure,
			payload: input,
			requestId
		};

		return new Promise<T>((resolve, reject) => {
			const timeout = setTimeout(() => {
				this.pendingRequests.delete(requestId);
				reject(new Error(`FlowsDB request timeout: ${procedure}`));
			}, this.requestTimeout);

			this.pendingRequests.set(requestId, { resolve, reject, timeout });

			try {
				const webkit = (window as any).webkit;
				if (!webkit?.messageHandlers?.thepia) {
					throw new Error('WebKit message handlers not available');
				}
				webkit.messageHandlers.thepia.postMessage(message);
			} catch (error) {
				clearTimeout(timeout);
				this.pendingRequests.delete(requestId);
				reject(error);
			}
		});
	}

	private handleResponse(response: {
		requestId: string;
		success: boolean;
		payload?: any;
		error?: { message: string };
	}): void {
		const pending = this.pendingRequests.get(response.requestId);
		if (!pending) {
			return;
		}

		clearTimeout(pending.timeout);
		this.pendingRequests.delete(response.requestId);

		if (response.success) {
			pending.resolve(response.payload);
		} else {
			pending.reject(new Error(response.error?.message || 'FlowsDB request failed'));
		}
	}

	cleanup(): void {
		for (const [, pending] of this.pendingRequests.entries()) {
			clearTimeout(pending.timeout);
			pending.reject(new Error('Bridge cleanup'));
		}
		this.pendingRequests.clear();

		if (typeof window !== 'undefined') {
			(window as any).__thepiaResponseHandler = undefined;
		}
	}
}

// Type augmentation for WebKit message handlers
declare global {
	interface Window {
		webkit?: {
			messageHandlers?: {
				thepia?: {
					postMessage(message: unknown): void;
				};
			};
		};
		__thepiaResponseHandler?: (response: {
			requestId: string;
			success: boolean;
			payload?: any;
			error?: { message: string };
		}) => void;
	}
}
