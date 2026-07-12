<script lang="ts">
import type { ClientCreditBalance } from '$lib/types/offboarding';

export let balance: ClientCreditBalance;

function getBalanceStatus(): {
  level: 'healthy' | 'low' | 'critical';
  color: string;
  message: string;
} {
  if (balance.available_credits <= balance.critical_balance_threshold) {
    return {
      level: 'critical',
      color: 'text-red-600',
      message: 'Critical - immediate action required',
    };
  } else if (balance.available_credits <= balance.low_balance_threshold) {
    return {
      level: 'low',
      color: 'text-yellow-600',
      message: 'Low balance - consider purchasing more credits',
    };
  } else {
    return {
      level: 'healthy',
      color: 'text-green-600',
      message: 'Healthy balance',
    };
  }
}

function _formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

function _formatDate(dateString: string | undefined): string {
  if (!dateString) return 'Never';
  return new Date(dateString).toLocaleDateString();
}

function getUsageProgress(): number {
  if (balance.total_purchased === 0) return 0;
  return (balance.total_used / balance.total_purchased) * 100;
}

// biome-ignore lint/suspicious/noGlobalAssign: Svelte reactive declaration, not a window.status assignment
$: status = getBalanceStatus();
$: usageProgress = getUsageProgress();
</script>

<Card class="relative">
  <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
    <CardTitle class="text-sm font-medium">Credit Balance</CardTitle>
    <CreditCard class="w-4 h-4 text-muted-foreground" />
  </CardHeader>
  <CardContent>
    <div class="space-y-3">
      <!-- Available Credits -->
      <div>
        <div class="flex items-center justify-between">
          <span class="text-2xl font-bold">{balance.available_credits}</span>
          <Badge 
            variant="outline" 
            class={status.level === 'critical' ? 'bg-red-50 text-red-700 border-red-200' : 
                   status.level === 'low' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 
                   'bg-green-50 text-green-700 border-green-200'}
          >
            {status.level.toUpperCase()}
          </Badge>
        </div>
        <p class="text-xs text-muted-foreground">
          Available credits
        </p>
      </div>

      <!-- Status Message -->
      {#if status.level !== 'healthy'}
        <div class="flex items-start gap-2 p-2 rounded-lg bg-yellow-50 border border-yellow-200">
          <AlertTriangle class="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
          <div class="text-xs text-yellow-700">
            <p class="font-medium">{status.message}</p>
            {#if status.level === 'critical'}
              <p class="mt-1">Only {balance.available_credits} credits remaining. Workflows may be blocked.</p>
            {/if}
          </div>
        </div>
      {/if}

      <!-- Credit Breakdown -->
      <div class="text-xs space-y-2">
        <div class="flex justify-between">
          <span class="text-muted-foreground">Total Purchased:</span>
          <span class="font-medium">{balance.total_purchased}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-muted-foreground">Used:</span>
          <span class="font-medium">{balance.total_used}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-muted-foreground">Reserved:</span>
          <span class="font-medium">{balance.reserved_credits}</span>
        </div>
        {#if balance.total_refunded > 0}
          <div class="flex justify-between">
            <span class="text-muted-foreground">Refunded:</span>
            <span class="font-medium">{balance.total_refunded}</span>
          </div>
        {/if}
      </div>

      <!-- Usage Progress -->
      <div class="space-y-2">
        <div class="flex justify-between text-xs">
          <span class="text-muted-foreground">Usage Rate</span>
          <span class="font-medium">{Math.round(usageProgress)}%</span>
        </div>
        <Progress value={usageProgress} class="h-2" />
      </div>

      <!-- Financial Summary -->
      <div class="pt-2 border-t border-gray-100 text-xs space-y-1">
        <div class="flex justify-between">
          <span class="text-muted-foreground">Total Spent:</span>
          <span class="font-medium">{formatCurrency(balance.total_spent)}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-muted-foreground">Avg. Price:</span>
          <span class="font-medium">{formatCurrency(balance.average_credit_price)}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-muted-foreground">Last Purchase:</span>
          <span class="font-medium">{formatDate(balance.last_purchase_at)}</span>
        </div>
      </div>

      <!-- Auto-replenish Info -->
      {#if balance.auto_replenish_enabled}
        <div class="flex items-center gap-2 p-2 rounded-lg bg-blue-50 border border-blue-200">
          <Info class="w-4 h-4 text-blue-600 flex-shrink-0" />
          <div class="text-xs text-blue-700">
            <p class="font-medium">Auto-replenish enabled</p>
            <p>Will purchase {balance.auto_replenish_amount} credits when balance drops to {balance.auto_replenish_threshold}</p>
          </div>
        </div>
      {/if}

      <!-- Action Buttons -->
      <div class="pt-2 space-y-2">
        <Button 
          variant="outline" 
          size="sm" 
          class="w-full text-xs"
          disabled={status.level !== 'critical' && status.level !== 'low'}
        >
          <Plus class="w-3 h-3 mr-1" />
          Purchase Credits
        </Button>
        
        <Button 
          variant="ghost" 
          size="sm" 
          class="w-full text-xs text-muted-foreground"
        >
          <TrendingUp class="w-3 h-3 mr-1" />
          View Usage History
        </Button>
      </div>
    </div>
  </CardContent>

  <!-- Critical Balance Indicator -->
  {#if status.level === 'critical'}
    <div class="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
  {/if}
</Card>

<style>
  :global(.credit-balance-widget) {
    position: relative;
  }
</style>