<script lang="ts">
import LoadingAnimation from '$lib/components/shared/LoadingAnimation.svelte';
import TFCManagementPanel from '$lib/components/tfc/TFCManagementPanel.svelte';
import { client } from '$lib/stores/data';
import { Download, FileText } from 'lucide-svelte';
import { createEventDispatcher } from 'svelte';

const dispatch = createEventDispatcher();

// Props for account data (will be passed from parent)
export let recentInvoices = [];
export let accountContacts = [];
export let loadingAccount = false;
</script>

<!-- Account Tab Content -->
<div class="space-y-8" data-testid="view-account">
  <!-- Account Header -->
  <div class="flex justify-between items-center">
    <div>
      <h2 class="text-2xl font-bold text-gray-900">Account Management</h2>
      <p class="text-gray-600">Manage your company account, billing, and access</p>
    </div>
  </div>

  <!-- Account Overview Grid -->
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <!-- Company Information -->
    <div class="lg:col-span-2 space-y-6">
      <!-- Company Details Card -->
      <div class="bg-white rounded-lg shadow-sm border">
        <div class="px-6 py-4 border-b">
          <h3 class="text-lg font-medium text-gray-900">Company Information</h3>
        </div>
        <div class="p-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div class="block text-sm font-medium text-gray-700 mb-1">Company Name</div>
              <div class="text-sm text-gray-900">{$client?.legal_name || $client?.name || 'Loading...'}</div>
            </div>
            <div>
              <div class="block text-sm font-medium text-gray-700 mb-1">Client Code</div>
              <div class="text-sm text-gray-900 font-mono">{$client?.client_code || $client?.code || 'Loading...'}</div>
            </div>
            <div>
              <div class="block text-sm font-medium text-gray-700 mb-1">Industry</div>
              <div class="text-sm text-gray-900">{$client?.industry || 'Not specified'}</div>
            </div>
            <div>
              <div class="block text-sm font-medium text-gray-700 mb-1">Domain</div>
              <div class="text-sm text-gray-900">{$client?.domain || 'Not specified'}</div>
            </div>
            <div>
              <div class="block text-sm font-medium text-gray-700 mb-1">Account Tier</div>
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {
                $client?.tier === 'enterprise' ? 'bg-purple-100 text-purple-800' :
                $client?.tier === 'pro' ? 'bg-blue-100 text-blue-800' :
                'bg-gray-100 text-gray-800'
              }">
                {$client?.tier || 'standard'}
              </span>
            </div>
            <div>
              <div class="block text-sm font-medium text-gray-700 mb-1">Status</div>
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {
                $client?.status === 'active' ? 'bg-green-100 text-green-800' :
                $client?.status === 'trial' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }">
                {$client?.status || 'active'}
              </span>
            </div>
          </div>
          
          {#if $client?.description}
            <div class="mt-4">
              <div class="block text-sm font-medium text-gray-700 mb-1">Company Description</div>
              <div class="text-sm text-gray-600 leading-relaxed">{$client.description}</div>
            </div>
          {/if}
        </div>
      </div>

      <!-- TFC Management Panel -->
      <TFCManagementPanel clientId={$client?.id} />

      <!-- Recent Invoices -->
      <div class="bg-white rounded-lg shadow-sm border">
        <div class="px-6 py-4 border-b">
          <div class="flex justify-between items-center">
            <h3 class="text-lg font-medium text-gray-900">Recent Invoices</h3>
            <button class="text-blue-600 hover:text-blue-700 text-sm font-medium">View All</button>
          </div>
        </div>
        <div class="divide-y">
          {#if loadingAccount}
            <div class="px-6 py-8 text-center text-gray-500">
              <LoadingAnimation message="Loading invoices..." size="sm" />
            </div>
          {:else if recentInvoices.length > 0}
            {#each recentInvoices as invoice}
              <div class="px-6 py-4 flex items-center justify-between">
                <div class="flex items-center gap-4">
                  <FileText class="w-5 h-5 text-gray-400" />
                  <div>
                    <div class="font-medium text-gray-900">{invoice.invoice_number}</div>
                    <div class="text-sm text-gray-500">
                      {new Date(invoice.invoice_date).toLocaleDateString()} 
                      {#if invoice.line_items && invoice.line_items.length > 0}
                        • {invoice.line_items.map(item => item.description).join(', ')}
                      {/if}
                    </div>
                  </div>
                </div>
                <div class="flex items-center gap-4">
                  <div class="text-right">
                    <div class="font-medium text-gray-900">
                      {new Intl.NumberFormat('da-DK', { 
                        style: 'currency', 
                        currency: 'DKK' 
                      }).format(invoice.total_amount)}
                    </div>
                    <div class="text-sm text-gray-500 capitalize">{invoice.status}</div>
                  </div>
                  <button class="text-blue-600 hover:text-blue-700">
                    <Download class="w-4 h-4" />
                  </button>
                </div>
              </div>
            {/each}
          {:else}
            <div class="px-6 py-8 text-center text-gray-500">
              <FileText class="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p>No recent invoices</p>
            </div>
          {/if}
        </div>
      </div>
    </div>

    <!-- Account Contacts Sidebar -->
    <div class="space-y-6">
      <div class="bg-white rounded-lg shadow-sm border">
        <div class="px-6 py-4 border-b">
          <h3 class="text-lg font-medium text-gray-900">Account Contacts</h3>
        </div>
        <div class="divide-y">
          {#if accountContacts.length > 0}
            {#each accountContacts as contact}
              <div class="px-6 py-4">
                <div class="font-medium text-gray-900">{contact.name}</div>
                <div class="text-sm text-gray-500">{contact.role}</div>
                <div class="text-sm text-blue-600">{contact.email}</div>
              </div>
            {/each}
          {:else}
            <div class="px-6 py-8 text-center text-gray-500">
              <p>No contacts configured</p>
            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>
</div>