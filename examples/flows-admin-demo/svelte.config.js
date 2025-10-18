import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  // Consult https://svelte.dev/docs/kit/integrations
  // for more information about preprocessors
  preprocess: vitePreprocess(),

  kit: {
    // Use auto adapter for hybrid functionality (SSR + client-side)
    // Enables server endpoints (error reporting) while supporting client-only auth
    adapter: adapter(),
    prerender: {
      entries: [], // No prerendering - pure client-side app
    }
  },
};

export default config;
