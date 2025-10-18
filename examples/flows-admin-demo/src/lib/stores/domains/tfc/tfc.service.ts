import { reportSupabaseError } from '$lib/config/errorReporting';
import { supabaseClientStore } from '$lib/contexts/supabase-context';
import { get } from 'svelte/store';
import type {
  TFCBalance,
  TFCPricingTier,
  TFCTransaction,
  TFCUsageAnalytics,
  TimeSavingsCalculation,
} from './tfc.types';

// Get current Supabase client from store
function getCurrentSupabaseClient() {
  const client = get(supabaseClientStore);
  if (!client) {
    throw new Error('Authentication required - please sign in to access TFC data');
  }
  return client;
}

export class TFCService {
  // Pricing tiers configuration
  private readonly pricingTiers: TFCPricingTier[] = [
    {
      tier: 'individual',
      minAmount: 1,
      maxAmount: 499,
      discountPercentage: 0,
      pricePerCredit: 150.0,
    },
    {
      tier: 'bulk_tier_1',
      minAmount: 500,
      maxAmount: 2499,
      discountPercentage: 25,
      pricePerCredit: 112.5,
    },
    {
      tier: 'bulk_tier_2',
      minAmount: 2500,
      discountPercentage: 30,
      pricePerCredit: 105.0,
    },
  ];

  // Time savings constants
  private readonly timeSavingsPerProcess = {
    onboarding: 10, // hours saved per onboarding
    offboarding: 8, // hours saved per offboarding
  };

  /**
   * Load TFC balance for a client
   */
  async loadBalance(clientId: string): Promise<TFCBalance | null> {
    try {
      const supabase = getCurrentSupabaseClient();
      const { data, error } = await supabase
        .from('tfc_client_balances')
        .select('*')
        .eq('client_id', clientId)
        .single();

      if (error && error.code !== 'PGRST116') {
        // Not found is ok
        await reportSupabaseError('tfc_client_balances', 'select', error, {
          operation: 'loadBalance',
          clientId,
        });
        throw new Error(`Failed to load TFC balance: ${error.message}`);
      }

      return data;
    } catch (error) {
      await reportSupabaseError('tfc_client_balances', 'select', error, {
        operation: 'loadBalance',
        clientId,
      });
      throw error;
    }
  }

  /**
   * Load recent TFC transactions
   */
  async loadTransactions(clientId: string, limit = 10): Promise<TFCTransaction[]> {
    try {
      const supabase = getCurrentSupabaseClient();
      const { data, error } = await supabase
        .from('tfc_credit_transactions')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        await reportSupabaseError('tfc_credit_transactions', 'select', error, {
          operation: 'loadTransactions',
          clientId,
        });
        throw new Error(`Failed to load transactions: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      await reportSupabaseError('tfc_credit_transactions', 'select', error, {
        operation: 'loadTransactions',
        clientId,
      });
      throw error;
    }
  }

  /**
   * Load usage analytics for the last 30 days
   */
  async loadUsageAnalytics(clientId: string): Promise<TFCUsageAnalytics[]> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const supabase = getCurrentSupabaseClient();
      const { data, error } = await supabase
        .from('tfc_workflow_usage')
        .select('workflow_type, department_category, credits_consumed, consumed_at')
        .eq('client_id', clientId)
        .gte('consumed_at', thirtyDaysAgo.toISOString())
        .order('consumed_at', { ascending: false });

      if (error) {
        await reportSupabaseError('tfc_workflow_usage', 'select', error, {
          operation: 'loadUsageAnalytics',
          clientId,
        });
        throw new Error(`Failed to load usage analytics: ${error.message}`);
      }

      // Aggregate usage by workflow type and department
      const analytics = this.aggregateUsageData(data || []);
      return analytics;
    } catch (error) {
      await reportSupabaseError('tfc_workflow_usage', 'select', error, {
        operation: 'loadUsageAnalytics',
        clientId,
      });
      throw error;
    }
  }

  /**
   * Calculate pricing for a given credit amount
   */
  calculatePricing(creditAmount: number): TFCPricingTier & { totalAmount: number } {
    const tier =
      this.pricingTiers.find(
        (t) => creditAmount >= t.minAmount && (!t.maxAmount || creditAmount <= t.maxAmount)
      ) || this.pricingTiers[0];

    return {
      ...tier,
      totalAmount: creditAmount * tier.pricePerCredit,
    };
  }

  /**
   * Calculate time savings from usage analytics
   */
  calculateTimeSavings(usageAnalytics: TFCUsageAnalytics[]): TimeSavingsCalculation {
    let totalHoursSaved = 0;
    const hoursByDepartment: Record<string, number> = {};
    const hoursByWorkflowType: Record<string, number> = {};

    usageAnalytics.forEach((usage) => {
      const hours = usage.count * this.timeSavingsPerProcess[usage.workflow_type];

      totalHoursSaved += hours;

      hoursByDepartment[usage.department_category] =
        (hoursByDepartment[usage.department_category] || 0) + hours;

      hoursByWorkflowType[usage.workflow_type] =
        (hoursByWorkflowType[usage.workflow_type] || 0) + hours;
    });

    return {
      totalHoursSaved,
      workingDaysSaved: Math.round(totalHoursSaved / 8), // Assuming 8-hour work days
      hoursByDepartment,
      hoursByWorkflowType,
    };
  }

  /**
   * Format time savings for display
   */
  formatTimeSaved(totalHours: number): string {
    if (totalHours >= 1000) {
      return `${Math.round(totalHours / 100) / 10}k hours`;
    }
    return `${totalHours.toLocaleString()} hours`;
  }

  /**
   * Get all pricing tiers
   */
  getPricingTiers(): TFCPricingTier[] {
    return [...this.pricingTiers];
  }

  /**
   * Private method to aggregate usage data
   */
  private aggregateUsageData(rawData: any[]): TFCUsageAnalytics[] {
    const aggregated: Record<string, TFCUsageAnalytics> = {};

    rawData.forEach((usage) => {
      const key = `${usage.workflow_type}-${usage.department_category}`;

      if (!aggregated[key]) {
        aggregated[key] = {
          workflow_type: usage.workflow_type,
          department_category: usage.department_category,
          count: 0,
          credits_consumed: 0,
          hours_saved: 0,
        };
      }

      aggregated[key].count += 1;
      aggregated[key].credits_consumed += usage.credits_consumed;
      aggregated[key].hours_saved += this.timeSavingsPerProcess[usage.workflow_type];
    });

    return Object.values(aggregated).slice(0, 10); // Limit to top 10
  }
}
