import { derived, writable } from 'svelte/store';
import { TFCService } from './tfc.service';
import type { TFCState, TimeSavingsCalculation } from './tfc.types';

// Service instance
const tfcService = new TFCService();

// Base state
const state = writable<TFCState>({
  balance: null,
  transactions: [],
  usageAnalytics: [],
  loading: false,
  error: null,
});

// Derived stores
export const balance = derived(state, ($state) => $state.balance);
export const transactions = derived(state, ($state) => $state.transactions);
export const usageAnalytics = derived(state, ($state) => $state.usageAnalytics);
export const loading = derived(state, ($state) => $state.loading);
export const error = derived(state, ($state) => $state.error);

// Computed derived stores
export const timeSavings = derived(usageAnalytics, ($usageAnalytics): TimeSavingsCalculation => {
  return tfcService.calculateTimeSavings($usageAnalytics);
});

export const formattedTimeSaved = derived(timeSavings, ($timeSavings) =>
  tfcService.formatTimeSaved($timeSavings.totalHoursSaved)
);

export const hasBalance = derived(
  balance,
  ($balance) => !!$balance && $balance.current_balance > 0
);

export const isLowBalance = derived(balance, ($balance) => {
  if (!$balance) return false;
  return $balance.current_balance <= $balance.low_balance_threshold;
});

export const isCriticalBalance = derived(balance, ($balance) => {
  if (!$balance) return false;
  return $balance.current_balance <= $balance.critical_balance_threshold;
});

export const utilizationPercentage = derived(balance, ($balance) => {
  if (!$balance || $balance.total_purchased === 0) return 0;
  return Math.min(100, ($balance.total_used / $balance.total_purchased) * 100);
});

// Actions
const actions = {
  async loadTFCData(clientId: string) {
    if (!clientId) return;

    state.update((s) => ({ ...s, loading: true, error: null }));

    try {
      // Load all TFC data in parallel
      const [balance, transactions, usageAnalytics] = await Promise.all([
        tfcService.loadBalance(clientId),
        tfcService.loadTransactions(clientId, 10),
        tfcService.loadUsageAnalytics(clientId),
      ]);

      state.update((s) => ({
        ...s,
        balance,
        transactions,
        usageAnalytics,
        loading: false,
      }));
    } catch (error) {
      state.update((s) => ({
        ...s,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load TFC data',
      }));
    }
  },

  async refreshBalance(clientId: string) {
    if (!clientId) return;

    try {
      const balance = await tfcService.loadBalance(clientId);
      state.update((s) => ({ ...s, balance }));
    } catch (error) {
      state.update((s) => ({
        ...s,
        error: error instanceof Error ? error.message : 'Failed to refresh balance',
      }));
    }
  },

  async refreshTransactions(clientId: string) {
    if (!clientId) return;

    try {
      const transactions = await tfcService.loadTransactions(clientId, 10);
      state.update((s) => ({ ...s, transactions }));
    } catch (error) {
      state.update((s) => ({
        ...s,
        error: error instanceof Error ? error.message : 'Failed to refresh transactions',
      }));
    }
  },

  clearData() {
    state.set({
      balance: null,
      transactions: [],
      usageAnalytics: [],
      loading: false,
      error: null,
    });
  },

  clearError() {
    state.update((s) => ({ ...s, error: null }));
  },
};

// Export the complete store interface
export const tfcStore = {
  // State
  subscribe: state.subscribe,

  // Derived values
  balance,
  transactions,
  usageAnalytics,
  loading,
  error,
  timeSavings,
  formattedTimeSaved,
  hasBalance,
  isLowBalance,
  isCriticalBalance,
  utilizationPercentage,

  // Actions
  actions,
};

// Export individual actions for convenience
export const { loadTFCData, refreshBalance, refreshTransactions, clearData, clearError } = actions;

// Export service for advanced use cases
export { tfcService };
