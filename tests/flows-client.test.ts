/**
 * FlowsClient Client Unit Tests
 *
 * Tests the FlowsClient class and its SessionPersistence implementation
 * Focus on the auth procedures with optional userId parameters
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FlowsClient } from '../src/lib/flows-client';
import type { SessionData, UserData } from '../src/types/auth';

describe('FlowsClient', () => {
	let client: FlowsClient;
	let mockServiceWorker: any;
	let mockRegistration: any;
	let messageHandlers: Map<string, (payload: any) => any>;

	beforeEach(() => {
		messageHandlers = new Map();

		// Mock ServiceWorker registration
		mockServiceWorker = {
			postMessage: vi.fn((message: any, ports: any[]) => {
				// Simulate async message handling
				setTimeout(() => {
					const port = ports[0];
					const handler = messageHandlers.get(message.procedure);

					if (handler) {
						const response = handler(message.payload);
						port.postMessage(response);
					} else {
						port.postMessage({
							error: {
								message: `Unknown procedure: ${message.procedure}`
							}
						});
					}
				}, 0);
			})
		};

		mockRegistration = {
			active: mockServiceWorker
		};

		// Mock navigator.serviceWorker using vi.stubGlobal
		vi.stubGlobal('navigator', {
			serviceWorker: {
				register: vi.fn().mockResolvedValue(mockRegistration),
				ready: Promise.resolve(mockRegistration),
				controller: mockServiceWorker
			}
		});

		// Mock MessageChannel
		global.MessageChannel = class {
			port1: any;
			port2: any;

			constructor() {
				this.port1 = {
					onmessage: null,
					postMessage: vi.fn()
				};
				this.port2 = {
					postMessage: vi.fn()
				};

				// Wire up port2.postMessage to trigger port1.onmessage
				this.port2.postMessage = (data: any) => {
					if (this.port1.onmessage) {
						this.port1.onmessage({ data });
					}
				};
			}
		} as any;

		client = new FlowsClient({
			serviceWorkerUrl: '/test-sw.js',
			scope: '/',
			debug: false
		});
	});

	afterEach(() => {
		vi.clearAllMocks();
		vi.unstubAllGlobals();
		messageHandlers.clear();
	});

	describe('SessionPersistence Interface', () => {
		describe('saveSession', () => {
			it('should call auth.saveSession RPC procedure', async () => {
				const sessionData: SessionData = {
					userId: 'user-123',
					email: 'test@example.com',
					name: 'Test User',
					accessToken: 'access-token',
					refreshToken: 'refresh-token',
					expiresAt: new Date(Date.now() + 3600000).toISOString(),
					refreshedAt: new Date().toISOString(),
					authMethod: 'passkey'
				};

				// Set up mock response
				messageHandlers.set('auth.saveSession', () => ({
					payload: undefined
				}));

				await client.session.saveSession(sessionData);

				expect(mockServiceWorker.postMessage).toHaveBeenCalled();
				const call = mockServiceWorker.postMessage.mock.calls[0];
				expect(call[0].procedure).toBe('auth.saveSession');
				expect(call[0].payload).toEqual(sessionData);
			});
		});

		describe('loadSession', () => {
			it('should call auth.getSession RPC procedure', async () => {
				const mockSession: SessionData = {
					userId: 'user-456',
					email: 'loaded@example.com',
					accessToken: 'loaded-token',
					refreshToken: 'loaded-refresh',
					expiresAt: new Date(Date.now() + 3600000).toISOString(),
					refreshedAt: new Date().toISOString(),
					authMethod: 'email-code'
				};

				messageHandlers.set('auth.getSession', () => ({
					payload: mockSession
				}));

				const result = await client.session.loadSession();

				expect(result).toEqual(mockSession);
				expect(mockServiceWorker.postMessage).toHaveBeenCalled();
				const call = mockServiceWorker.postMessage.mock.calls[0];
				expect(call[0].procedure).toBe('auth.getSession');
			});

			it('should return null when no session exists', async () => {
				messageHandlers.set('auth.getSession', () => ({
					payload: null
				}));

				const result = await client.session.loadSession();

				expect(result).toBeNull();
			});
		});

		describe('clearSession', () => {
			it('should call auth.clearSession RPC procedure', async () => {
				messageHandlers.set('auth.clearSession', () => ({
					payload: undefined
				}));

				await client.session.clearSession();

				expect(mockServiceWorker.postMessage).toHaveBeenCalled();
				const call = mockServiceWorker.postMessage.mock.calls[0];
				expect(call[0].procedure).toBe('auth.clearSession');
			});
		});

		describe('saveUser', () => {
			it('should call auth.saveUser RPC procedure', async () => {
				const userData: UserData = {
					userId: 'user-789',
					email: 'user@example.com',
					name: 'User Name',
					emailVerified: true
				};

				messageHandlers.set('auth.saveUser', () => ({
					payload: undefined
				}));

				await client.session.saveUser(userData);

				expect(mockServiceWorker.postMessage).toHaveBeenCalled();
				const call = mockServiceWorker.postMessage.mock.calls[0];
				expect(call[0].procedure).toBe('auth.saveUser');
				expect(call[0].payload).toEqual(userData);
			});
		});

		describe('getUser', () => {
			it('should call auth.getUser with userId parameter', async () => {
				const mockUser: UserData = {
					userId: 'user-abc',
					email: 'specific@example.com',
					name: 'Specific User'
				};

				messageHandlers.set('auth.getUser', (payload: string | undefined) => ({
					payload: payload === 'user-abc' ? mockUser : null
				}));

				const result = await client.session.getUser('user-abc');

				expect(result).toEqual(mockUser);
				expect(mockServiceWorker.postMessage).toHaveBeenCalled();
				const call = mockServiceWorker.postMessage.mock.calls[0];
				expect(call[0].procedure).toBe('auth.getUser');
				expect(call[0].payload).toBe('user-abc');
			});

			it('should call auth.getUser without userId parameter (optional)', async () => {
				const mockUser: UserData = {
					userId: 'current-user',
					email: 'current@example.com',
					name: 'Current User'
				};

				messageHandlers.set('auth.getUser', (payload: string | undefined) => ({
					payload: !payload ? mockUser : null
				}));

				const result = await client.session.getUser();

				expect(result).toEqual(mockUser);
				expect(mockServiceWorker.postMessage).toHaveBeenCalled();
				const call = mockServiceWorker.postMessage.mock.calls[0];
				expect(call[0].procedure).toBe('auth.getUser');
				expect(call[0].payload).toBeUndefined();
			});

			it('should return null when user not found', async () => {
				messageHandlers.set('auth.getUser', () => ({
					payload: null
				}));

				const result = await client.session.getUser('nonexistent');

				expect(result).toBeNull();
			});
		});

		describe('clearUser', () => {
			it('should call auth.clearUser with userId parameter', async () => {
				messageHandlers.set('auth.clearUser', () => ({
					payload: undefined
				}));

				await client.session.clearUser('user-xyz');

				expect(mockServiceWorker.postMessage).toHaveBeenCalled();
				const call = mockServiceWorker.postMessage.mock.calls[0];
				expect(call[0].procedure).toBe('auth.clearUser');
				expect(call[0].payload).toBe('user-xyz');
			});

			it('should call auth.clearUser without userId parameter (clear all/current)', async () => {
				messageHandlers.set('auth.clearUser', () => ({
					payload: undefined
				}));

				await client.session.clearUser();

				expect(mockServiceWorker.postMessage).toHaveBeenCalled();
				const call = mockServiceWorker.postMessage.mock.calls[0];
				expect(call[0].procedure).toBe('auth.clearUser');
				expect(call[0].payload).toBeUndefined();
			});
		});
	});

	describe('Error Handling', () => {
		it('should reject when RPC call fails', async () => {
			messageHandlers.set('auth.getSession', () => ({
				error: {
					message: 'IndexedDB not available'
				}
			}));

			await expect(client.session.loadSession()).rejects.toThrow('IndexedDB not available');
		});

		it('should throw error when no service worker available', async () => {
			// Create client without service worker
			vi.stubGlobal('navigator', {
				serviceWorker: {
					register: vi.fn().mockResolvedValue({ active: null }),
					ready: Promise.resolve({ active: null }),
					controller: null
				}
			});

			const brokenClient = new FlowsClient();

			// Wait for initialization
			await new Promise(resolve => setTimeout(resolve, 10));

			await expect(brokenClient.session.loadSession()).rejects.toThrow(
				'No active service worker'
			);
		});
	});

	describe('RPC Message Format', () => {
		it('should include request ID in messages', async () => {
			messageHandlers.set('auth.getSession', () => ({
				payload: null
			}));

			await client.session.loadSession();

			const call = mockServiceWorker.postMessage.mock.calls[0];
			expect(call[0].id).toBeDefined();
			expect(typeof call[0].id).toBe('string');
		});

		it('should include type "request" in messages', async () => {
			messageHandlers.set('auth.getSession', () => ({
				payload: null
			}));

			await client.session.loadSession();

			const call = mockServiceWorker.postMessage.mock.calls[0];
			expect(call[0].type).toBe('request');
		});

		it('should transfer MessageChannel port', async () => {
			messageHandlers.set('auth.getSession', () => ({
				payload: null
			}));

			await client.session.loadSession();

			const call = mockServiceWorker.postMessage.mock.calls[0];
			expect(call[1]).toBeDefined();
			expect(Array.isArray(call[1])).toBe(true);
			expect(call[1].length).toBe(1);
		});
	});
});
