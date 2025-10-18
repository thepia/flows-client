<script lang="ts">
import { Alert, AlertDescription } from '$lib/components/ui/alert';
import { Badge } from '$lib/components/ui/badge';
import { Button } from '$lib/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
import { Checkbox } from '$lib/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '$lib/components/ui/dialog';
import { Input } from '$lib/components/ui/input';
import { Label } from '$lib/components/ui/label';
import { Progress } from '$lib/components/ui/progress';
import { Select } from '$lib/components/ui/select';
import { Textarea } from '$lib/components/ui/textarea';
import { supabaseClientStore, isSupabaseAuthenticatedStore } from '$lib/contexts/supabase-context';
import type {
  CreateKnowledgeTransferItemRequest,
  KnowledgeTransferItem,
  OffboardingWorkflow,
} from '$lib/types/offboarding';
import {
  AlertTriangle,
  BookOpen,
  Calendar,
  CheckCircle,
  Clock,
  ContactIcon,
  Edit,
  FileText,
  Plus,
  Trash2,
  User,
  Users,
  Video,
} from 'lucide-svelte';
import { createEventDispatcher } from 'svelte';

export let workflow: OffboardingWorkflow;
export const knowledgeItems: KnowledgeTransferItem[] = [];
export const readonly = false;

const dispatch = createEventDispatcher();
// Use global stores directly

let loading = false;
let error: string | null = null;
let showCreateModal = false;
let editingItem: KnowledgeTransferItem | null = null;

// Form data for creating/editing knowledge items
let formData: Partial<CreateKnowledgeTransferItemRequest> = {
  offboarding_workflow_id: workflow.id,
  knowledge_type: 'process_documentation',
  title: '',
  description: '',
  business_impact: 'medium',
  urgency: 'standard',
  successor_role: '',
  estimated_hours: 2.0,
};

function resetForm() {
  formData = {
    offboarding_workflow_id: workflow.id,
    knowledge_type: 'process_documentation',
    title: '',
    description: '',
    business_impact: 'medium',
    urgency: 'standard',
    successor_role: '',
    estimated_hours: 2.0,
  };
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'in_progress':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'completed':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'not_required':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

function getBusinessImpactColor(impact: string): string {
  switch (impact) {
    case 'critical':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'high':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'medium':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'low':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

function getKnowledgeTypeIcon(type: string) {
  switch (type) {
    case 'process_documentation':
      return FileText;
    case 'client_relationships':
      return Users;
    case 'vendor_relationships':
      return ContactIcon;
    case 'system_knowledge':
      return BookOpen;
    case 'team_procedures':
      return Users;
    default:
      return FileText;
  }
}

function calculateProgress(): number {
  if (knowledgeItems.length === 0) return 0;
  const completed = knowledgeItems.filter((item) => item.knowledge_verified).length;
  return (completed / knowledgeItems.length) * 100;
}

function getTotalEstimatedHours(): number {
  return knowledgeItems.reduce((total, item) => total + item.estimated_hours, 0);
}

function getTotalActualHours(): number {
  return knowledgeItems.reduce((total, item) => total + (item.actual_hours || 0), 0);
}

async function handleCreateItem() {
  try {
    loading = true;
    error = null;

    if (!$isSupabaseAuthenticatedStore || !$supabaseClientStore) {
      throw new Error('Please sign in to create knowledge transfer items');
    }

    if (!formData.title?.trim()) {
      throw new Error('Knowledge item title is required');
    }

    const { data, error: insertError } = await $supabaseClientStore
      .from('knowledge_transfer_items')
      .insert({
        offboarding_workflow_id: formData.offboarding_workflow_id,
        knowledge_type: formData.knowledge_type,
        title: formData.title.trim(),
        description: formData.description?.trim() || null,
        business_impact: formData.business_impact,
        urgency: formData.urgency,
        successor_role: formData.successor_role?.trim() || null,
        estimated_hours: formData.estimated_hours || 2.0,
        documentation_status: 'pending',
        handover_session_required: true,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    showCreateModal = false;
    resetForm();
    dispatch('refresh');
  } catch (err) {
    console.error('Error creating knowledge item:', err);
    error = err instanceof Error ? err.message : 'Failed to create knowledge item';
  } finally {
    loading = false;
  }
}

async function handleUpdateStatus(
  item: KnowledgeTransferItem,
  updates: Partial<KnowledgeTransferItem>
) {
  try {
    loading = true;
    error = null;

    if (!$isSupabaseAuthenticatedStore || !$supabaseClientStore) {
      throw new Error('Please sign in to update knowledge transfer items');
    }

    const { error: updateError } = await $supabaseClientStore
      .from('knowledge_transfer_items')
      .update(updates)
      .eq('id', item.id);

    if (updateError) throw updateError;

    dispatch('refresh');
  } catch (err) {
    console.error('Error updating knowledge item:', err);
    error = err instanceof Error ? err.message : 'Failed to update knowledge item';
  } finally {
    loading = false;
  }
}

async function handleDeleteItem(item: KnowledgeTransferItem) {
  if (!confirm('Are you sure you want to delete this knowledge transfer item?')) return;

  try {
    loading = true;
    error = null;

    if (!$isSupabaseAuthenticatedStore || !$supabaseClientStore) {
      throw new Error('Please sign in to delete knowledge transfer items');
    }

    const { error: deleteError } = await $supabaseClientStore
      .from('knowledge_transfer_items')
      .delete()
      .eq('id', item.id);

    if (deleteError) throw deleteError;

    dispatch('refresh');
  } catch (err) {
    console.error('Error deleting knowledge item:', err);
    error = err instanceof Error ? err.message : 'Failed to delete knowledge item';
  } finally {
    loading = false;
  }
}

function openCreateModal() {
  resetForm();
  editingItem = null;
  showCreateModal = true;
}

function openEditModal(item: KnowledgeTransferItem) {
  formData = {
    offboarding_workflow_id: item.offboarding_workflow_id,
    knowledge_type: item.knowledge_type,
    title: item.title,
    description: item.description || '',
    business_impact: item.business_impact,
    urgency: item.urgency,
    successor_role: item.successor_role || '',
    estimated_hours: item.estimated_hours,
  };
  editingItem = item;
  showCreateModal = true;
}

async function handleSaveItem() {
  if (editingItem) {
    await handleUpdateItem();
  } else {
    await handleCreateItem();
  }
}

async function handleUpdateItem() {
  try {
    loading = true;
    error = null;

    if (!$isSupabaseAuthenticatedStore || !$supabaseClientStore) {
      throw new Error('Please sign in to update knowledge transfer items');
    }

    if (!formData.title?.trim()) {
      throw new Error('Knowledge item title is required');
    }

    const { error: updateError } = await $supabaseClientStore
      .from('knowledge_transfer_items')
      .update({
        knowledge_type: formData.knowledge_type,
        title: formData.title.trim(),
        description: formData.description?.trim() || null,
        business_impact: formData.business_impact,
        urgency: formData.urgency,
        successor_role: formData.successor_role?.trim() || null,
        estimated_hours: formData.estimated_hours || 2.0,
      })
      .eq('id', editingItem!.id);

    if (updateError) throw updateError;

    showCreateModal = false;
    editingItem = null;
    resetForm();
    dispatch('refresh');
  } catch (err) {
    console.error('Error updating knowledge item:', err);
    error = err instanceof Error ? err.message : 'Failed to update knowledge item';
  } finally {
    loading = false;
  }
}

$: progress = calculateProgress();
$: totalEstimatedHours = getTotalEstimatedHours();
$: totalActualHours = getTotalActualHours();
</script>

<Card>
  <CardHeader>
    <div class="flex items-center justify-between">
      <CardTitle class="flex items-center gap-2">
        <BookOpen class="w-5 h-5" />
        Knowledge Transfer Management
      </CardTitle>
      {#if !readonly}
        <Button on:click={openCreateModal} size="sm">
          <Plus class="w-4 h-4 mr-2" />
          Add Knowledge Item
        </Button>
      {/if}
    </div>
  </CardHeader>

  <CardContent class="space-y-6">
    {#if error}
      <Alert variant="destructive">
        <AlertTriangle class="w-4 h-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    {/if}

    <!-- Progress Summary -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
      <div class="text-center">
        <p class="text-2xl font-bold text-gray-900">{knowledgeItems.length}</p>
        <p class="text-sm text-gray-600">Total Items</p>
      </div>
      <div class="text-center">
        <p class="text-2xl font-bold text-green-600">
          {knowledgeItems.filter(item => item.knowledge_verified).length}
        </p>
        <p class="text-sm text-gray-600">Completed</p>
      </div>
      <div class="text-center">
        <p class="text-2xl font-bold text-blue-600">{totalEstimatedHours}h</p>
        <p class="text-sm text-gray-600">Est. Hours</p>
      </div>
      <div class="text-center">
        <p class="text-2xl font-bold text-purple-600">{totalActualHours}h</p>
        <p class="text-sm text-gray-600">Actual Hours</p>
      </div>
    </div>

    <!-- Overall Progress -->
    <div class="space-y-2">
      <div class="flex items-center justify-between text-sm">
        <span class="font-medium">Knowledge Transfer Progress</span>
        <span>{Math.round(progress)}% Complete</span>
      </div>
      <Progress value={progress} class="h-3" />
    </div>

    <!-- Knowledge Items List -->
    <div class="space-y-4">
      {#if knowledgeItems.length === 0}
        <div class="text-center py-8 text-gray-500">
          <BookOpen class="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p class="mb-2">No knowledge transfer items yet</p>
          {#if !readonly}
            <Button on:click={openCreateModal} variant="outline">
              <Plus class="w-4 h-4 mr-2" />
              Add First Knowledge Item
            </Button>
          {/if}
        </div>
      {:else}
        {#each knowledgeItems as item (item.id)}
          <Card class="border-l-4" class:border-l-green-500={item.knowledge_verified} class:border-l-blue-500={!item.knowledge_verified}>
            <CardContent class="p-4">
              <div class="flex items-start justify-between">
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 mb-2">
                    <svelte:component this={getKnowledgeTypeIcon(item.knowledge_type)} class="w-4 h-4 text-gray-600" />
                    <h4 class="font-medium text-gray-900 truncate">{item.title}</h4>
                    <Badge variant="outline" class={getBusinessImpactColor(item.business_impact)}>
                      {item.business_impact.toUpperCase()}
                    </Badge>
                    <Badge variant="outline" class={getStatusColor(item.documentation_status)}>
                      {item.documentation_status.replace(/_/g, ' ').toUpperCase()}
                    </Badge>
                  </div>

                  {#if item.description}
                    <p class="text-sm text-gray-600 mb-3">{item.description}</p>
                  {/if}

                  <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-gray-500">
                    <div>
                      <span class="font-medium">Type:</span>
                      {item.knowledge_type.replace(/_/g, ' ')}
                    </div>
                    <div>
                      <span class="font-medium">Successor:</span>
                      {item.successor_role || 'Not assigned'}
                    </div>
                    <div>
                      <span class="font-medium">Est. Hours:</span>
                      {item.estimated_hours}h
                    </div>
                    <div>
                      <span class="font-medium">Actual Hours:</span>
                      {item.actual_hours || 0}h
                    </div>
                  </div>

                  <!-- Progress Indicators -->
                  <div class="mt-3 flex items-center gap-4 text-xs">
                    <div class="flex items-center gap-1">
                      <CheckCircle class="w-3 h-3" class:text-green-500={item.successor_identified} class:text-gray-400={!item.successor_identified} />
                      <span class:text-green-600={item.successor_identified} class:text-gray-500={!item.successor_identified}>
                        Successor Identified
                      </span>
                    </div>
                    <div class="flex items-center gap-1">
                      <FileText class="w-3 h-3" class:text-green-500={item.documentation_reviewed} class:text-gray-400={!item.documentation_reviewed} />
                      <span class:text-green-600={item.documentation_reviewed} class:text-gray-500={!item.documentation_reviewed}>
                        Documentation Reviewed
                      </span>
                    </div>
                    <div class="flex items-center gap-1">
                      <Calendar class="w-3 h-3" class:text-green-500={item.handover_session_completed} class:text-gray-400={!item.handover_session_completed} />
                      <span class:text-green-600={item.handover_session_completed} class:text-gray-500={!item.handover_session_completed}>
                        Handover Session
                      </span>
                    </div>
                    <div class="flex items-center gap-1">
                      <CheckCircle class="w-3 h-3" class:text-green-500={item.knowledge_verified} class:text-gray-400={!item.knowledge_verified} />
                      <span class:text-green-600={item.knowledge_verified} class:text-gray-500={!item.knowledge_verified}>
                        Verified
                      </span>
                    </div>
                  </div>

                  <!-- Documentation Attachments -->
                  {#if item.has_written_documentation || item.has_process_diagrams || item.has_video_walkthroughs || item.has_contact_lists}
                    <div class="mt-3 flex items-center gap-2">
                      <span class="text-xs text-gray-500">Attachments:</span>
                      {#if item.has_written_documentation}
                        <Badge variant="outline" class="text-xs">Documentation</Badge>
                      {/if}
                      {#if item.has_process_diagrams}
                        <Badge variant="outline" class="text-xs">Diagrams</Badge>
                      {/if}
                      {#if item.has_video_walkthroughs}
                        <Badge variant="outline" class="text-xs">Videos</Badge>
                      {/if}
                      {#if item.has_contact_lists}
                        <Badge variant="outline" class="text-xs">Contacts</Badge>
                      {/if}
                    </div>
                  {/if}
                </div>

                {#if !readonly}
                  <div class="flex items-center gap-1 ml-4">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      on:click={() => openEditModal(item)}
                    >
                      <Edit class="w-3 h-3" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      on:click={() => handleDeleteItem(item)}
                      class="text-red-600 hover:text-red-700"
                    >
                      <Trash2 class="w-3 h-3" />
                    </Button>
                  </div>
                {/if}
              </div>

              <!-- Quick Actions -->
              {#if !readonly && !item.knowledge_verified}
                <div class="mt-4 pt-3 border-t border-gray-100 flex items-center gap-2">
                  {#if !item.successor_identified}
                    <Button 
                      size="sm" 
                      variant="outline" 
                      on:click={() => handleUpdateStatus(item, { successor_identified: true })}
                    >
                      Mark Successor Identified
                    </Button>
                  {/if}
                  {#if item.successor_identified && !item.handover_session_completed}
                    <Button 
                      size="sm" 
                      variant="outline" 
                      on:click={() => handleUpdateStatus(item, { handover_session_completed: true })}
                    >
                      Mark Handover Complete
                    </Button>
                  {/if}
                  {#if item.handover_session_completed && !item.knowledge_verified}
                    <Button 
                      size="sm" 
                      variant="default" 
                      on:click={() => handleUpdateStatus(item, { 
                        knowledge_verified: true, 
                        documentation_reviewed: true,
                        successor_confirmation_received: true,
                        actual_completion_date: new Date().toISOString().split('T')[0]
                      })}
                    >
                      Mark Verified
                    </Button>
                  {/if}
                </div>
              {/if}
            </CardContent>
          </Card>
        {/each}
      {/if}
    </div>
  </CardContent>
</Card>

<!-- Create/Edit Knowledge Item Modal -->
{#if showCreateModal}
  <Dialog bind:open={showCreateModal}>
    <DialogContent class="max-w-2xl">
      <DialogHeader>
        <DialogTitle>
          {editingItem ? 'Edit' : 'Create'} Knowledge Transfer Item
        </DialogTitle>
      </DialogHeader>

      <form on:submit|preventDefault={handleSaveItem} class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="space-y-2">
            <Label for="title">Title *</Label>
            <Input
              id="title"
              bind:value={formData.title}
              placeholder="e.g., Client onboarding process"
              required
            />
          </div>

          <div class="space-y-2">
            <Label for="knowledge_type">Knowledge Type</Label>
            <Select bind:value={formData.knowledge_type}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="process_documentation">Process Documentation</SelectItem>
                <SelectItem value="client_relationships">Client Relationships</SelectItem>
                <SelectItem value="vendor_relationships">Vendor Relationships</SelectItem>
                <SelectItem value="project_handover">Project Handover</SelectItem>
                <SelectItem value="system_knowledge">System Knowledge</SelectItem>
                <SelectItem value="tribal_knowledge">Tribal Knowledge</SelectItem>
                <SelectItem value="team_procedures">Team Procedures</SelectItem>
                <SelectItem value="compliance_knowledge">Compliance Knowledge</SelectItem>
                <SelectItem value="training_materials">Training Materials</SelectItem>
                <SelectItem value="institutional_memory">Institutional Memory</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div class="space-y-2">
          <Label for="description">Description</Label>
          <Textarea
            id="description"
            bind:value={formData.description}
            placeholder="Detailed description of the knowledge to be transferred..."
            rows={3}
          />
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="space-y-2">
            <Label for="business_impact">Business Impact</Label>
            <Select bind:value={formData.business_impact}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div class="space-y-2">
            <Label for="urgency">Urgency</Label>
            <Select bind:value={formData.urgency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="standard">Standard</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="immediate">Immediate</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div class="space-y-2">
            <Label for="estimated_hours">Estimated Hours</Label>
            <Input
              id="estimated_hours"
              type="number"
              min="0.5"
              step="0.5"
              bind:value={formData.estimated_hours}
            />
          </div>
        </div>

        <div class="space-y-2">
          <Label for="successor_role">Successor Role</Label>
          <Input
            id="successor_role"
            bind:value={formData.successor_role}
            placeholder="e.g., Senior Account Manager, Team Lead"
          />
        </div>

        <div class="flex items-center justify-end gap-3 pt-4 border-t">
          <Button 
            type="button" 
            variant="outline" 
            on:click={() => showCreateModal = false}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {#if loading}
              <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            {/if}
            {editingItem ? 'Update' : 'Create'} Item
          </Button>
        </div>
      </form>
    </DialogContent>
  </Dialog>
{/if}