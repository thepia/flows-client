/**
 * Authentication and Session Types for Flows DB
 *
 * These types define the session data structure used for authentication
 * persistence in IndexedDB via the Service Worker.
 *
 * NOTE: SessionData and UserData are imported from @thepia/flows-auth (TYPES ONLY).
 * This ensures single source of truth for auth-related types.
 * No runtime code from flows-auth is imported - only TypeScript type definitions.
 */

// Import types from flows-auth - TYPES ONLY, no runtime code
import type { SessionData, UserData } from '@thepia/flows-auth';

// Re-export for convenience
export type { SessionData, UserData };


/**
 * Auth procedures for RPC calls
 */
export interface AuthProcedures {
	'auth.saveSession': {
		input: Partial<SessionData>;
		output: SessionData;
	};
	'auth.getSession': {
		input: undefined;
		output: SessionData | null;
	};
	'auth.clearSession': {
		input: undefined;
		// biome-ignore lint/suspicious/noConfusingVoidType: <explanation>
		output: void;
	};
	'auth.saveUser': {
		input: UserData;
		// biome-ignore lint/suspicious/noConfusingVoidType: <explanation>
		output: void;
	};
	'auth.getUser': {
		input: string | undefined; // userId (optional - get current user if not provided)
		output: UserData | null;
	};
	'auth.clearUser': {
		input: string | undefined; // userId (optional - clear all or current user if not provided)
		// biome-ignore lint/suspicious/noConfusingVoidType: <explanation>
		output: void;
	};
}
