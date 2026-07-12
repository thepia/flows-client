<script lang="ts">
// Props
export let templates = [];
export let onTemplateSelect = (_template) => {};
export let onCreateTemplate = () => {};
export let onEditTemplate = (_template) => {};
export let loading = false;

// Local state
let searchTerm = '';
let filterDepartment = 'all';
let filterType = 'all';
let _selectedTemplate = null;

// Filter templates based on search and filters
$: filteredTemplates = templates.filter((template) => {
  let matches = true;

  // Search filter
  if (searchTerm) {
    matches =
      matches &&
      (template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.department?.toLowerCase().includes(searchTerm.toLowerCase()));
  }

  // Department filter
  if (filterDepartment !== 'all') {
    matches =
      matches &&
      (filterDepartment === 'company_wide'
        ? template.template_type === 'company_wide'
        : template.department === filterDepartment);
  }

  // Type filter
  if (filterType !== 'all') {
    matches = matches && template.template_type === filterType;
  }

  return matches;
});

// Get unique departments from templates
$: departments = [...new Set(templates.filter((t) => t.department).map((t) => t.department))];

// Get complexity color
function _getComplexityColor(score) {
  if (score <= 2) return 'bg-green-100 text-green-800';
  if (score <= 3) return 'bg-yellow-100 text-yellow-800';
  if (score <= 4) return 'bg-orange-100 text-orange-800';
  return 'bg-red-100 text-red-800';
}

// Get template type badge variant
function _getTypeVariant(type) {
  switch (type) {
    case 'company_wide':
      return 'default';
    case 'department_specific':
      return 'secondary';
    case 'role_specific':
      return 'outline';
    default:
      return 'destructive';
  }
}

// Handle template selection
function _selectTemplate(template) {
  _selectedTemplate = template;
  onTemplateSelect(template);
}
</script>

<div class="space-y-6">
  <!-- Header and Controls -->
  <div class="flex items-center justify-between">
    <div>
      <h2 class="text-2xl font-bold text-gray-900">Offboarding Templates</h2>
      <p class="text-gray-600 mt-1">Manage and select offboarding process templates</p>
    </div>
    <Button on:click={onCreateTemplate} class="flex items-center gap-2">
      <Plus class="w-4 h-4" />
      Create Template
    </Button>
  </div>

  <!-- Search and Filters -->
  <Card>
    <CardContent class="pt-6">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <!-- Search -->
        <div class="md:col-span-2">
          <Label for="search">Search Templates</Label>
          <Input
            id="search"
            placeholder="Search by name, description, or department..."
            bind:value={searchTerm}
          />
        </div>
        
        <!-- Department Filter -->
        <div>
          <Label for="department-filter">Department</Label>
          <select 
            id="department-filter"
            bind:value={filterDepartment}
            class="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="all">All Departments</option>
            <option value="company_wide">Company-Wide</option>
            {#each departments as dept}
              <option value={dept}>{dept}</option>
            {/each}
          </select>
        </div>
        
        <!-- Type Filter -->
        <div>
          <Label for="type-filter">Template Type</Label>
          <select 
            id="type-filter"
            bind:value={filterType}
            class="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="all">All Types</option>
            <option value="company_wide">Company-Wide</option>
            <option value="department_specific">Department-Specific</option>
            <option value="role_specific">Role-Specific</option>
            <option value="custom">Custom</option>
          </select>
        </div>
      </div>
    </CardContent>
  </Card>

  <!-- Templates Grid -->
  <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
    {#each filteredTemplates as template}
      <Card 
        class="hover:shadow-lg transition-shadow cursor-pointer {selectedTemplate?.id === template.id ? 'ring-2 ring-blue-500' : ''}"
        on:click={() => selectTemplate(template)}
      >
        <CardHeader class="pb-3">
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <CardTitle class="text-lg">{template.name}</CardTitle>
              <p class="text-sm text-gray-600 mt-1">
                {template.description || 'No description provided'}
              </p>
            </div>
            <div class="flex items-center gap-2 ml-2">
              <button 
                class="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background hover:bg-accent hover:text-accent-foreground h-9 w-9"
                on:click|stopPropagation={() => onEditTemplate(template)}
              >
                <Edit class="w-4 h-4" />
              </button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent class="space-y-4">
          <!-- Template Metadata -->
          <div class="flex flex-wrap gap-2">
            <Badge variant={getTypeVariant(template.template_type)}>
              {template.template_type.replace('_', ' ')}
            </Badge>
            
            {#if template.department}
              <Badge variant="outline">
                {template.department}
              </Badge>
            {/if}
            
            {#if template.role_category}
              <Badge variant="outline">
                {template.role_category}
              </Badge>
            {/if}
            
            {#if template.seniority_level}
              <Badge variant="outline">
                {template.seniority_level}
              </Badge>
            {/if}
          </div>
          
          <!-- Template Stats -->
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div class="flex items-center gap-2">
              <Clock class="w-4 h-4 text-gray-500" />
              <span>{template.estimated_duration_days} days</span>
            </div>
            
            <div class="flex items-center gap-2">
              <Badge class={getComplexityColor(template.complexity_score)}>
                Complexity: {template.complexity_score}
              </Badge>
            </div>
            
            <div class="flex items-center gap-2">
              <FileText class="w-4 h-4 text-gray-500" />
              <span>{template.task_count || 0} tasks</span>
            </div>
            
            <div class="flex items-center gap-2">
              <Users class="w-4 h-4 text-gray-500" />
              <span>{template.usage_count || 0} uses</span>
            </div>
          </div>
          
          <!-- Approval Requirements -->
          <div class="flex flex-wrap gap-1 text-xs">
            {#if template.requires_manager_approval}
              <Badge variant="outline" class="text-xs">Manager Approval</Badge>
            {/if}
            {#if template.requires_hr_approval}
              <Badge variant="outline" class="text-xs">HR Approval</Badge>
            {/if}
            {#if template.requires_security_review}
              <Badge variant="outline" class="text-xs">Security Review</Badge>
            {/if}
          </div>
          
          <!-- Default Indicator -->
          {#if template.is_default}
            <div class="flex items-center gap-2 text-sm text-blue-600">
              <Settings class="w-4 h-4" />
              <span>Default Template</span>
            </div>
          {/if}
        </CardContent>
      </Card>
    {/each}
  </div>

  <!-- Empty State -->
  {#if filteredTemplates.length === 0 && !loading}
    <Card>
      <CardContent class="flex flex-col items-center justify-center py-12">
        <FileText class="w-12 h-12 text-gray-300 mb-4" />
        <h3 class="text-lg font-medium text-gray-900 mb-2">No templates found</h3>
        <p class="text-gray-500 text-center mb-4">
          {#if searchTerm || filterDepartment !== 'all' || filterType !== 'all'}
            No templates match your current filters. Try adjusting your search criteria.
          {:else}
            Get started by creating your first offboarding template.
          {/if}
        </p>
        {#if !searchTerm && filterDepartment === 'all' && filterType === 'all'}
          <Button on:click={onCreateTemplate}>
            <Plus class="w-4 h-4 mr-2" />
            Create Your First Template
          </Button>
        {/if}
      </CardContent>
    </Card>
  {/if}

  <!-- Loading State -->
  {#if loading}
    <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
      {#each Array(6) as _}
        <Card>
          <CardHeader>
            <div class="animate-pulse">
              <div class="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div class="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </CardHeader>
          <CardContent>
            <div class="animate-pulse space-y-3">
              <div class="flex gap-2">
                <div class="h-6 bg-gray-200 rounded w-20"></div>
                <div class="h-6 bg-gray-200 rounded w-16"></div>
              </div>
              <div class="grid grid-cols-2 gap-2">
                <div class="h-4 bg-gray-200 rounded"></div>
                <div class="h-4 bg-gray-200 rounded"></div>
                <div class="h-4 bg-gray-200 rounded"></div>
                <div class="h-4 bg-gray-200 rounded"></div>
              </div>
            </div>
          </CardContent>
        </Card>
      {/each}
    </div>
  {/if}
</div>

