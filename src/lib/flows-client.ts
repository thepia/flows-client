/**
 * Flows DB Client
 *
 * Type-safe client for communicating with the Flows Service Worker.
 * Uses MessageChannel for request/response RPC pattern.
 */

// TYPES ONLY imports from flows-auth - no runtime code
import type { SessionPersistence, SessionData, UserData } from '@thepia/flows-auth';

import type {
	FlowsDBProcedures,
	ProcedureInput,
	ProcedureOutput,
	TransportMessage
} from '../types/index';

export interface FlowsClientConfig {
	/**
	 * Path to the service worker file
	 * @default '/flows-sw.js'
	 */
	serviceWorkerUrl?: string;

	/**
	 * Service worker scope
	 * @default '/'
	 */
	scope?: string;

	/**
	 * Whether to log debug messages
	 * @default false
	 */
	debug?: boolean;
}

export class FlowsDBClient {
	private registration: ServiceWorkerRegistration | null = null;
	private ready: Promise<void>;
	private config: Required<FlowsClientConfig>;

	constructor(config: FlowsClientConfig = {}) {
		this.config = {
			serviceWorkerUrl: config.serviceWorkerUrl || '/flows-sw.js',
			scope: config.scope || '/',
			debug: config.debug || false
		};

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

		if (!('serviceWorker' in navigator)) {
			throw new Error('Service Workers not supported in this browser');
		}

		// Register service worker
		this.log('Registering service worker...');
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
	 * Call a procedure on the service worker
	 */
	private async call<P extends keyof FlowsDBProcedures>(
		procedure: P,
		input: ProcedureInput<P>
	): Promise<ProcedureOutput<P>> {
		await this.ready;

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
			saveSession: async (session: SessionData): Promise<void> => {
				await this.call('auth.saveSession', session);
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
