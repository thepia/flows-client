/**
 * Vitest test setup
 */

import { vi } from 'vitest';
import '@testing-library/jest-dom/vitest';

// Mock SvelteKit runtime
vi.mock('$app/environment', () => ({
  browser: true,
  building: false,
  dev: true,
}));

vi.mock('$app/navigation', () => ({
  goto: vi.fn().mockResolvedValue(true),
  invalidateAll: vi.fn().mockResolvedValue(true),
}));

vi.mock('$app/stores', () => ({
  page: {
    subscribe: vi.fn(() => () => {}),
  },
  navigating: {
    subscribe: vi.fn(() => () => {}),
  },
  updated: {
    subscribe: vi.fn(() => () => {}),
  },
}));

// Mock Supabase TODO set up the client in the store instead
vi.mock('$lib/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    like: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    contains: vi.fn().mockReturnThis(),
    containedBy: vi.fn().mockReturnThis(),
    rangeGt: vi.fn().mockReturnThis(),
    rangeGte: vi.fn().mockReturnThis(),
    rangeLt: vi.fn().mockReturnThis(),
    rangeLte: vi.fn().mockReturnThis(),
    rangeAdjacent: vi.fn().mockReturnThis(),
    overlaps: vi.fn().mockReturnThis(),
    textSearch: vi.fn().mockReturnThis(),
    match: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    filter: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    abortSignal: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    csv: vi.fn().mockResolvedValue({ data: '', error: null }),
    geojson: vi.fn().mockResolvedValue({ data: null, error: null }),
    explain: vi.fn().mockResolvedValue({ data: null, error: null }),
    rollback: vi.fn().mockResolvedValue({ data: null, error: null }),
    returns: vi.fn().mockReturnThis(),
  },
}));

// Mock error reporting
vi.mock('$lib/config/errorReporting', () => ({
  reportSupabaseError: vi.fn().mockResolvedValue(undefined),
  reportAdminFlowError: vi.fn().mockResolvedValue(undefined),
  getAdminErrorReportingConfig: vi.fn().mockResolvedValue({
    enabled: true,
    serverType: 'mock-server',
    environment: 'test',
  }),
  flushAdminErrorReports: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('$lib/utils/errorReporter', () => ({
  reportAdminError: vi.fn().mockResolvedValue(undefined),
  getAdminErrorReportQueueSize: vi.fn().mockReturnValue(0),
}));

// Mock orchestrator
vi.mock('$lib/orchestrators/demo-client-switcher', () => ({
  demoClientSwitcher: {
    switchDemoClient: vi.fn().mockResolvedValue(true),
    switchClientContext: vi.fn().mockResolvedValue(true),
    loadTFCData: vi.fn().mockResolvedValue(true),
    loadPeopleData: vi.fn().mockResolvedValue(true),
    getAvailableClients: vi.fn().mockResolvedValue([]),
  },
}));

// Global test setup
beforeEach(() => {
  // Reset all mocks before each test
  vi.clearAllMocks();

  // Setup DOM environment
  document.body.innerHTML = '';

  // Mock window.location
  Object.defineProperty(window, 'location', {
    value: {
      hostname: 'localhost',
      port: '5174',
      protocol: 'http:',
      host: 'localhost:5174',
      href: 'http://localhost:5174/',
      search: '',
      pathname: '/',
      hash: '',
    },
    writable: true,
  });

  // Mock localStorage
  const mockLocalStorage = {
    getItem: vi.fn(() => null),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    key: vi.fn(),
    length: 0,
  };
  Object.defineProperty(window, 'localStorage', {
    value: mockLocalStorage,
    writable: true,
  });

  // Mock crypto for JWT operations
  Object.defineProperty(window, 'crypto', {
    value: {
      subtle: {
        digest: vi.fn().mockResolvedValue(new ArrayBuffer(32)),
      },
    },
    writable: true,
  });

  // Mock TextEncoder/TextDecoder
  global.TextEncoder = vi.fn().mockImplementation(() => ({
    encode: vi.fn().mockReturnValue(new Uint8Array([1, 2, 3, 4])),
  }));

  global.TextDecoder = vi.fn().mockImplementation(() => ({
    decode: vi.fn().mockReturnValue('decoded-string'),
  }));
});

afterEach(() => {
  // Clean up after each test
  vi.restoreAllMocks();
});

// Suppress console logs during tests unless running in debug mode
if (!process.env.VITEST_DEBUG) {
  beforeAll(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
}
