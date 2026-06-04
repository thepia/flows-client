import type { SessionData, UserData } from '@thepia/flows-auth/types';
import { SEED_JOURNEYS, SEED_TASKS, SEED_EVIDENCE, SEED_COMMENTS } from './seed';
import { INDEXEDDB_NAME, INDEXEDDB_VERSION } from '../constants';
import { getRecentLogs, cleanupOldLogs, exportLogs } from './logger';

// IndexedDB connection
let db: IDBDatabase | null = null;
let isSeeded = false;

/**
 * Initialize IndexedDB with schema
 */
export async function initDB(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(INDEXEDDB_NAME, INDEXEDDB_VERSION);

		request.onerror = () => reject(request.error);
		request.onsuccess = () => {
			db = request.result;
			resolve(db);
		};

		request.onupgradeneeded = (event) => {
			const db = (event.target as IDBOpenDBRequest).result;

			// Create object stores for each entity type
			if (!db.objectStoreNames.contains('journeys')) {
				const journeyStore = db.createObjectStore('journeys', { keyPath: 'id' });
				journeyStore.createIndex('client_id', 'client_id', { unique: false });
				journeyStore.createIndex('status', 'status', { unique: false });
				journeyStore.createIndex('created_at', 'created_at', { unique: false });
			}

			if (!db.objectStoreNames.contains('tasks')) {
				const taskStore = db.createObjectStore('tasks', { keyPath: 'id' });
				taskStore.createIndex('journey_id', 'journey_id', { unique: false });
				taskStore.createIndex('status', 'status', { unique: false });
				taskStore.createIndex('assigned_to', 'assigned_to', { unique: false });
			}

			if (!db.objectStoreNames.contains('attachments')) {
				const attachmentStore = db.createObjectStore('attachments', { keyPath: 'id' });
				attachmentStore.createIndex('journey_id', 'journey_id', { unique: false });
				attachmentStore.createIndex('task_id', 'task_id', { unique: false });
			}

			if (!db.objectStoreNames.contains('evidence')) {
				const evidenceStore = db.createObjectStore('evidence', { keyPath: 'id' });
				evidenceStore.createIndex('journey_id', 'journey_id', { unique: false });
				evidenceStore.createIndex('task_id', 'task_id', { unique: false });
				evidenceStore.createIndex('type', 'type', { unique: false });
			}

			if (!db.objectStoreNames.contains('comments')) {
				const commentStore = db.createObjectStore('comments', { keyPath: 'id' });
				commentStore.createIndex('journey_id', 'journey_id', { unique: false });
				commentStore.createIndex('task_id', 'task_id', { unique: false });
			}

			if (!db.objectStoreNames.contains('notes')) {
				const noteStore = db.createObjectStore('notes', { keyPath: 'id' });
				noteStore.createIndex('journey_id', 'journey_id', { unique: false });
				noteStore.createIndex('task_id', 'task_id', { unique: false });
			}

			// Auth tables (v2+)
			// Users table - persistent user profiles that survive sign out
			if (!db.objectStoreNames.contains('users')) {
				const usersStore = db.createObjectStore('users', { keyPath: 'userId' });
				usersStore.createIndex('email', 'email', { unique: true });
				usersStore.createIndex('lastUsed', 'lastUsed', { unique: false });
			}

			// Sessions table - temporary auth tokens (cleared on sign out)
			// Primary key: userId (one session per user)
			if (!db.objectStoreNames.contains('auth_sessions')) {
				const authStore = db.createObjectStore('auth_sessions', { keyPath: 'userId' });
				// Indexes for cleanup and debugging queries
				authStore.createIndex('expiresAt', 'expiresAt', { unique: false });
				authStore.createIndex('createdAt', 'createdAt', { unique: false });
				authStore.createIndex('savedAt', 'savedAt', { unique: false });
				// Note: metadata field is stored as JSON string, no index needed
			}
		};
	});
}

/**
 * Seed database with initial data if empty
 */
export async function seedDatabase(): Promise<void> {
	if (isSeeded || !db) return;

	const transaction = db.transaction(['journeys'], 'readonly');
	const store = transaction.objectStore('journeys');
	const countRequest = store.count();

	return new Promise((resolve) => {
		countRequest.onsuccess = () => {
			if (countRequest.result === 0 && db) {
				console.log('[SW] Database empty, seeding with demo data...');

				// Seed journeys
				const journeyTx = db.transaction(['journeys'], 'readwrite');
				const journeyStore = journeyTx.objectStore('journeys');
				for (const journey of SEED_JOURNEYS) {
					journeyStore.add(journey);
				}

				// Seed tasks
				const taskTx = db.transaction(['tasks'], 'readwrite');
				const taskStore = taskTx.objectStore('tasks');
				for (const task of SEED_TASKS) {
					taskStore.add(task);
				}

				// Seed evidence
				const evidenceTx = db.transaction(['evidence'], 'readwrite');
				const evidenceStore = evidenceTx.objectStore('evidence');
				for (const evidence of SEED_EVIDENCE) {
					evidenceStore.add(evidence);
				}

				// Seed comments
				const commentTx = db.transaction(['comments'], 'readwrite');
				const commentStore = commentTx.objectStore('comments');
				for (const comment of SEED_COMMENTS) {
					commentStore.add(comment);
				}

				console.log('[SW] Seeded database with demo data');
			}
			isSeeded = true;
			resolve();
		};
	});
}

/**
 * RPC Handler - processes procedure calls from clients
 */
export async function handleRPC(procedure: string, input: any): Promise<any> {
	if (!db) {
		await initDB();
		await seedDatabase();
	}

	const [namespace, method] = procedure.split('.');

	if (namespace === 'query') {
		return handleQuery(method, input);
	}
	if (namespace === 'mutation') {
		return handleMutation(method, input);
	}
	if (namespace === 'sync') {
		return handleSync(method, input);
	}
	if (namespace === 'auth') {
		return handleAuth(method, input);
	}
	if (namespace === 'debug') {
		return handleDebug(method, input);
	}

	throw new Error(`Unknown procedure: ${procedure}`);
}

/**
 * Query handlers
 */
export async function handleQuery(method: string, input: any): Promise<any> {
	switch (method) {
		case 'journeys':
			return queryJourneys(input);
		case 'journeyById':
			return getJourneyById(input.id);
		case 'tasks':
			return queryTasks(input);
		case 'tasksByJourney':
			return getTasksByJourney(input.journeyId, input);
		case 'evidence':
			return queryEvidence(input);
		case 'evidenceByTask':
			return getEvidenceByTask(input.taskId, input);
		default:
			throw new Error(`Unknown query method: ${method}`);
	}
}

/**
 * Mutation handlers
 */
export async function handleMutation(method: string, input: any): Promise<any> {
	switch (method) {
		case 'insertJourney':
			return insertJourney(input.data);
		case 'updateJourney':
			return updateJourney(input.id, input.data);
		case 'deleteJourney':
			return deleteJourney(input.id);
		case 'insertTask':
			return insertTask(input.data);
		case 'updateTask':
			return updateTask(input.id, input.data);
		default:
			throw new Error(`Unknown mutation method: ${method}`);
	}
}

/**
 * Query implementations
 */
export async function queryJourneys(options: any = {}): Promise<any[]> {
	return new Promise((resolve, reject) => {
		if (!db) return reject(new Error('DB not initialized'));

		const transaction = db.transaction(['journeys'], 'readonly');
		const store = transaction.objectStore('journeys');
		const request = store.getAll();

		request.onsuccess = () => {
			let results = request.result;

			// Apply filters
			if (options.filter?.eq) {
				results = results.filter((item: any) => {
					return Object.entries(options.filter.eq).every(([key, value]) => item[key] === value);
				});
			}

			// Apply ordering
			if (options.orderBy) {
				results.sort((a: any, b: any) => {
					for (const { column, ascending = true } of options.orderBy) {
						const aVal = a[column];
						const bVal = b[column];
						if (aVal < bVal) return ascending ? -1 : 1;
						if (aVal > bVal) return ascending ? 1 : -1;
					}
					return 0;
				});
			}

			// Apply limit
			if (options.limit) {
				results = results.slice(0, options.limit);
			}

			resolve(results);
		};

		request.onerror = () => reject(request.error);
	});
}

export async function getJourneyById(id: string): Promise<any> {
	return new Promise((resolve, reject) => {
		if (!db) return reject(new Error('DB not initialized'));

		const transaction = db.transaction(['journeys'], 'readonly');
		const store = transaction.objectStore('journeys');
		const request = store.get(id);

		request.onsuccess = () => resolve(request.result || null);
		request.onerror = () => reject(request.error);
	});
}

export async function queryTasks(options: any = {}): Promise<any[]> {
	return new Promise((resolve, reject) => {
		if (!db) return reject(new Error('DB not initialized'));

		const transaction = db.transaction(['tasks'], 'readonly');
		const store = transaction.objectStore('tasks');
		const request = store.getAll();

		request.onsuccess = () => {
			let results = request.result;

			// Apply filters
			if (options.filter?.eq) {
				results = results.filter((item: any) => {
					return Object.entries(options.filter.eq).every(([key, value]) => item[key] === value);
				});
			}

			// Apply ordering
			if (options.orderBy) {
				results.sort((a: any, b: any) => {
					for (const { column, ascending = true } of options.orderBy) {
						const aVal = a[column];
						const bVal = b[column];
						if (aVal < bVal) return ascending ? -1 : 1;
						if (aVal > bVal) return ascending ? 1 : -1;
					}
					return 0;
				});
			}

			resolve(results);
		};

		request.onerror = () => reject(request.error);
	});
}

export async function getTasksByJourney(journeyId: string, options: any = {}): Promise<any[]> {
	return new Promise((resolve, reject) => {
		if (!db) return reject(new Error('DB not initialized'));

		const transaction = db.transaction(['tasks'], 'readonly');
		const store = transaction.objectStore('tasks');
		const index = store.index('journey_id');
		const request = index.getAll(journeyId);

		request.onsuccess = () => {
			let results = request.result;

			// Apply ordering
			if (options.orderBy) {
				results.sort((a: any, b: any) => {
					for (const { column, ascending = true } of options.orderBy) {
						const aVal = a[column];
						const bVal = b[column];
						if (aVal < bVal) return ascending ? -1 : 1;
						if (aVal > bVal) return ascending ? 1 : -1;
					}
					return 0;
				});
			}

			resolve(results);
		};

		request.onerror = () => reject(request.error);
	});
}

export async function queryEvidence(options: any = {}): Promise<any[]> {
	return new Promise((resolve, reject) => {
		if (!db) return reject(new Error('DB not initialized'));

		const transaction = db.transaction(['evidence'], 'readonly');
		const store = transaction.objectStore('evidence');
		const request = store.getAll();

		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});
}

export async function getEvidenceByTask(taskId: string, options: any = {}): Promise<any[]> {
	return new Promise((resolve, reject) => {
		if (!db) return reject(new Error('DB not initialized'));

		const transaction = db.transaction(['evidence'], 'readonly');
		const store = transaction.objectStore('evidence');
		const index = store.index('task_id');
		const request = index.getAll(taskId);

		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});
}

/**
 * Mutation implementations
 */
export async function insertJourney(data: any): Promise<any> {
	const journey = {
		id: crypto.randomUUID(),
		...data,
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString()
	};

	return new Promise((resolve, reject) => {
		if (!db) return reject(new Error('DB not initialized'));

		const transaction = db.transaction(['journeys'], 'readwrite');
		const store = transaction.objectStore('journeys');
		const request = store.add(journey);

		request.onsuccess = () => resolve(journey);
		request.onerror = () => reject(request.error);
	});
}

export async function updateJourney(id: string, data: any): Promise<any> {
	const existing = await getJourneyById(id);
	if (!existing) {
		throw new Error('Journey not found');
	}

	const updated = {
		...existing,
		...data,
		updated_at: new Date().toISOString()
	};

	return new Promise((resolve, reject) => {
		if (!db) return reject(new Error('DB not initialized'));

		const transaction = db.transaction(['journeys'], 'readwrite');
		const store = transaction.objectStore('journeys');
		const request = store.put(updated);

		request.onsuccess = () => resolve(updated);
		request.onerror = () => reject(request.error);
	});
}

export async function deleteJourney(id: string): Promise<void> {
	return new Promise((resolve, reject) => {
		if (!db) return reject(new Error('DB not initialized'));

		const transaction = db.transaction(['journeys'], 'readwrite');
		const store = transaction.objectStore('journeys');
		const request = store.delete(id);

		request.onsuccess = () => resolve();
		request.onerror = () => reject(request.error);
	});
}

export async function insertTask(data: any): Promise<any> {
	const task = {
		id: crypto.randomUUID(),
		...data,
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString()
	};

	return new Promise((resolve, reject) => {
		if (!db) return reject(new Error('DB not initialized'));

		const transaction = db.transaction(['tasks'], 'readwrite');
		const store = transaction.objectStore('tasks');
		const request = store.add(task);

		request.onsuccess = () => resolve(task);
		request.onerror = () => reject(request.error);
	});
}

export async function updateTask(id: string, data: any): Promise<any> {
	return new Promise((resolve, reject) => {
		if (!db) return reject(new Error('DB not initialized'));

		const transaction = db.transaction(['tasks'], 'readonly');
		const store = transaction.objectStore('tasks');
		const getRequest = store.get(id);

		getRequest.onsuccess = () => {
			const existing = getRequest.result;
			if (!existing) {
				reject(new Error('Task not found'));
				return;
			}

			const updated = {
				...existing,
				...data,
				updated_at: new Date().toISOString()
			};

			if (!db) return reject(new Error('DB not initialized'));

			const writeTransaction = db.transaction(['tasks'], 'readwrite');
			const writeStore = writeTransaction.objectStore('tasks');
			const putRequest = writeStore.put(updated);

			putRequest.onsuccess = () => resolve(updated);
			putRequest.onerror = () => reject(putRequest.error);
		};

		getRequest.onerror = () => reject(getRequest.error);
	});
}

/**
 * Sync handlers (stubs for now)
 */
export async function handleSync(method: string, _input: any): Promise<any> {
	switch (method) {
		case 'status':
			return { tables: [], synced: true };
		default:
			throw new Error(`Unknown sync method: ${method}`);
	}
}

/**
 * Auth handlers - Session persistence
 */
export async function handleAuth(
	method: string,
	input: SessionData | UserData | string | undefined | any
): Promise<SessionData | UserData | Record<string, unknown> | null | undefined> {
	switch (method) {
		case 'saveSession':
			if (!input) throw new Error('Session data required for saveSession');
			return await saveAuthSession(input as SessionData);
		case 'getSession':
			return getAuthSession();
		case 'clearSession':
			await clearAuthSession();
			return undefined;
		case 'saveUser':
			if (!input) throw new Error('User data required for saveUser');
			await saveUser(input as UserData);
			return undefined;
		case 'getUser':
			if (typeof input !== 'string') throw new Error('userId required for getUser');
			return getUser(input);
		case 'clearUser':
			if (typeof input !== 'string') throw new Error('userId required for clearUser');
			await clearUser(input);
			return undefined;
		case 'updateUserMetadata':
			if (!input?.userId) throw new Error('userId required for updateUserMetadata');
			if (!input?.metadata) throw new Error('metadata required for updateUserMetadata');
			await updateUserMetadata(input.userId, input.metadata);
			return undefined;
		case 'patchMetadata':
			if (!input?.userId) throw new Error('userId required for patchMetadata');
			if (!input?.patch) throw new Error('patch required for patchMetadata');
			if (!input?.appCode) throw new Error('appCode required for patchMetadata');
			if (!input?.token) throw new Error('token required for patchMetadata');
			return await patchMetadata(input.userId, input.patch, input.appCode, input.token);
		default:
			throw new Error(`Unknown auth method: ${method}`);
	}
}

/**
 * Handle debug operations
 */
export async function handleDebug(
	method: string,
	input: any
): Promise<any> {
	switch (method) {
		case 'getRecentLogs':
			return getRecentLogs(input?.limit || 50);
		case 'clearDebugLogs':
			await cleanupOldLogs(0); // Clear all logs
			return undefined;
		case 'exportLogs':
			return exportLogs();
		default:
			throw new Error(`Unknown debug method: ${method}`);
	}
}

/**
 * Save authentication session to IndexedDB
 * Saves both session tokens AND updates user profile
 */
export async function saveAuthSession(session: SessionData): Promise<SessionData> {
	return new Promise((resolve, reject) => {
		if (!db) return reject(new Error('DB not initialized'));

		const now = new Date().toISOString();

		// Save to both users (persistent) and auth_sessions (temporary) tables
		const transaction = db.transaction(['users', 'auth_sessions'], 'readwrite');

		// Update users table - persistent profile
		const usersStore = transaction.objectStore('users');
		usersStore.put({
			userId: session.userId,
			email: session.email,
			name: session.name,
			emailVerified: session.emailVerified,
			metadata: session.metadata,
			lastUsed: now,
			authMethod: session.authMethod
		});

		// Update auth_sessions table - temporary tokens
		const sessionsStore = transaction.objectStore('auth_sessions');

		// Log refresh token for debugging token rotation issues
		console.log('[SW] Saving session with tokens:', {
			userId: session.userId,
			refreshToken: session.refreshToken?.substring(0, 8) + '...',
			expiresAt: new Date(session.expiresAt).toISOString(),
			hasSupabaseToken: !!session.supabaseToken,
			supabaseTokenPreview: session.supabaseToken?.substring(0, 20) + '...',
			supabaseExpiresAt: session.supabaseExpiresAt ? new Date(session.supabaseExpiresAt).toISOString() : 'none',
			savedAt: new Date(now).toISOString()
		});

		const sessionRequest = sessionsStore.put({
			userId: session.userId,
			email: session.email,
			createdAt: new Date().toISOString(),  // Session creation timestamp
			accessToken: session.accessToken,
			refreshToken: session.refreshToken,
			expiresAt: session.expiresAt,
			refreshedAt: session.refreshedAt,
			authMethod: session.authMethod,
			supabaseToken: session.supabaseToken,
			supabaseExpiresAt: session.supabaseExpiresAt,
			savedAt: now,
			metadata: session.metadata ? JSON.stringify(session.metadata) : undefined
		});

		sessionRequest.onsuccess = () => {
			console.log('[SW] Auth session saved:', session.userId);
			resolve(session);
		};
		sessionRequest.onerror = () => reject(sessionRequest.error);
	});
}

/**
 * Load authentication session from IndexedDB
 * Returns the most recent non-expired session
 */
export async function getAuthSession(): Promise<SessionData | null> {
	return new Promise((resolve, reject) => {
		if (!db) return reject(new Error('DB not initialized'));

		const transaction = db.transaction(['auth_sessions'], 'readonly');
		const store = transaction.objectStore('auth_sessions');
		const request = store.getAll();

		request.onsuccess = () => {
			const sessions = request.result;

			if (sessions.length === 0) {
				resolve(null);
				return;
			}

			// Return most recent session (by savedAt), regardless of expiry
			// Let the auth store decide what to do with expired sessions (e.g., refresh tokens)
			sessions.sort((a: any, b: any) => {
				return new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime();
			});

			const session = sessions[0];
			const expiresAtMs = new Date(session.expiresAt).getTime();
			const isExpired = expiresAtMs <= Date.now();
			const hasSupabaseToken = !!session.supabaseToken;
			console.log('[SW] Auth session loaded:', {
				userId: session.userId,
				status: isExpired ? 'expired' : 'valid',
				hasSupabaseToken,
				supabaseTokenExpiry: session.supabaseExpiresAt ? new Date(session.supabaseExpiresAt).toISOString() : 'none'
			});

			// Parse metadata if present
			const sessionWithParsedMetadata = {
				...session,
				metadata: session.metadata ? JSON.parse(session.metadata) : undefined
			};

			resolve(sessionWithParsedMetadata);
		};

		request.onerror = () => reject(request.error);
	});
}

/**
 * Clear authentication sessions from IndexedDB
 * NOTE: Clears auth_sessions (tokens) but preserves users table (profiles)
 */
export async function clearAuthSession(): Promise<void> {
	return new Promise((resolve, reject) => {
		if (!db) return reject(new Error('DB not initialized'));

		const transaction = db.transaction(['auth_sessions'], 'readwrite');
		const store = transaction.objectStore('auth_sessions');
		const request = store.clear();

		request.onsuccess = () => {
			console.log('[SW] Auth sessions cleared (user profiles preserved)');
			resolve();
		};
		request.onerror = () => reject(request.error);
	});
}

/**
 * Save user profile to IndexedDB
 * Updates or creates user profile in users table
 */
export async function saveUser(user: UserData): Promise<void> {
	return new Promise((resolve, reject) => {
		if (!db) return reject(new Error('DB not initialized'));

		const now = new Date().toISOString();
		const transaction = db.transaction(['users'], 'readwrite');
		const store = transaction.objectStore('users');

		const request = store.put({
			userId: user.userId,
			email: user.email,
			name: user.name,
			emailVerified: user.emailVerified,
			createdAt: user.createdAt,
			lastLoginAt: user.lastLoginAt,
			metadata: user.metadata,
			authMethod: user.authMethod,
			lastUsed: now
		});

		request.onsuccess = () => {
			console.log('[SW] User profile saved:', user.userId);
			resolve();
		};
		request.onerror = () => reject(request.error);
	});
}

/**
 * Get user profile from IndexedDB
 */
export async function getUser(userId: string): Promise<UserData | null> {
	return new Promise((resolve, reject) => {
		if (!db) return reject(new Error('DB not initialized'));

		const transaction = db.transaction(['users'], 'readonly');
		const store = transaction.objectStore('users');
		const request = store.get(userId);

		request.onsuccess = () => {
			const user = request.result;
			if (!user) {
				resolve(null);
				return;
			}

			resolve({
				userId: user.userId,
				email: user.email,
				name: user.name,
				emailVerified: user.emailVerified,
				createdAt: user.createdAt,
				lastLoginAt: user.lastLoginAt,
				metadata: user.metadata,
				authMethod: user.authMethod
			});
		};
		request.onerror = () => reject(request.error);
	});
}

/**
 * Clear user profile from IndexedDB
 */
export async function clearUser(userId: string): Promise<void> {
	return new Promise((resolve, reject) => {
		if (!db) return reject(new Error('DB not initialized'));

		const transaction = db.transaction(['users'], 'readwrite');
		const store = transaction.objectStore('users');
		const request = store.delete(userId);

		request.onsuccess = () => {
			console.log('[SW] User profile cleared:', userId);
			resolve();
		};
		request.onerror = () => reject(request.error);
	});
}

/**
 * Update user metadata in IndexedDB (targeted update)
 * Merges new metadata with existing metadata, preserving other fields
 */
export async function updateUserMetadata(userId: string, newMetadata: Record<string, unknown>): Promise<void> {
	return new Promise((resolve, reject) => {
		if (!db) return reject(new Error('DB not initialized'));

		const transaction = db.transaction(['users'], 'readwrite');
		const store = transaction.objectStore('users');
		const getRequest = store.get(userId);

		getRequest.onsuccess = () => {
			const user = getRequest.result;
			if (!user) {
				console.warn('[SW] User not found for metadata update:', userId);
				resolve();
				return;
			}

			// Merge new metadata with existing metadata (targeted update)
			const updatedUser = {
				...user,
				metadata: {
					...user.metadata,
					...newMetadata
				},
				lastUsed: new Date().toISOString()
			};

			const updateRequest = store.put(updatedUser);

			updateRequest.onsuccess = () => {
				console.log('[SW] User metadata updated:', userId, newMetadata);

				// Broadcast metadata update to all tabs
				broadcastMetadataUpdate(userId, updatedUser.metadata);

				resolve();
			};
			updateRequest.onerror = () => reject(updateRequest.error);
		};

		getRequest.onerror = () => reject(getRequest.error);
	});
}

/**
 * Patch user metadata via API with atomic server-side merge
 * Service Worker makes the API request, updates IndexedDB, and broadcasts to all tabs
 */
export async function patchMetadata(
	userId: string,
	patch: Record<string, unknown>,
	appCode: string,
	token: string
): Promise<Record<string, unknown>> {
	try {
		console.log('[SW] Patching metadata for user:', userId, { patchKeys: Object.keys(patch) });

		// Make API request to patch metadata
		const response = await fetch(`/api/${appCode}/metadata`, {
			method: 'PATCH',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${token}`
			},
			body: JSON.stringify({ patch })
		});

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}));
			throw new Error(`Failed to patch metadata: ${response.status} ${errorData.error || response.statusText}`);
		}

		const data = await response.json() as { success: boolean; metadata?: Record<string, unknown>; error?: string };

		if (!data.success || !data.metadata) {
			throw new Error(`Invalid response from metadata patch: ${data.error || 'unknown error'}`);
		}

		// Update IndexedDB with the new metadata
		await updateUserMetadata(userId, data.metadata);

		console.log('[SW] Metadata patched successfully for user:', userId);
		return data.metadata;
	} catch (error) {
		console.error('[SW] Failed to patch metadata:', error);
		throw error;
	}
}

/**
 * Broadcast metadata update to all client tabs via BroadcastChannel
 */
function broadcastMetadataUpdate(userId: string, metadata: Record<string, unknown>): void {
	try {
		const channel = new BroadcastChannel('auth-metadata-updates');
		channel.postMessage({
			type: 'METADATA_UPDATED',
			userId,
			metadata,
			timestamp: Date.now()
		});
		channel.close();
		console.log('[SW] Metadata update broadcasted to all tabs:', userId);
	} catch (error) {
		console.warn('[SW] Failed to broadcast metadata update:', error);
	}
}
