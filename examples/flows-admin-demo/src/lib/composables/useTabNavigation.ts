import { derived, writable } from 'svelte/store';

export function useTabNavigation(applications: any) {
  // Tab state management
  const activeTab = writable<string>('people');

  // Derived selected application - clear reactive dependency
  const selectedApp = derived([activeTab, applications], ([$activeTab, $applications]) => {
    if (!$applications || !Array.isArray($applications)) return null;
    return $applications.find((app) => app.code === $activeTab) || null;
  });

  // Valid tabs calculation
  const validTabs = derived([applications], ([$applications]) => {
    const baseTabs = ['people', 'processes', 'account'];
    const appTabs = $applications?.map((app) => app.code) || [];
    return [...baseTabs, ...appTabs];
  });

  // Navigation methods
  function navigateToTab(tab: string) {
    activeTab.set(tab);
  }

  function navigateToApplication(appCode: string) {
    activeTab.set(appCode);
  }

  return {
    // Stores
    activeTab,
    selectedApp,
    validTabs,

    // Methods
    navigateToTab,
    navigateToApplication,
  };
}
