import path from 'node:path';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, loadEnv } from 'vite';
import restart from 'vite-plugin-restart';

export default defineConfig(({ mode }) => {
  // Load env file from current directory
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      sveltekit(),
      tailwindcss(),
      restart({
        restart: [
          // Restart when database schemas change
          '../../schemas/*.sql',
          // Restart when scripts change
          '../../scripts/*.js',
          '../../scripts/*.cjs',
          '../../scripts/*.ts',
          // Restart when environment files change
          '.env',
          '.env.local',
          '.env.development',
          // Restart when Supabase config changes
          'src/lib/supabase.ts',
          'src/lib/supabase.js',
          // Restart when vite config itself changes
          'vite.config.ts',
          'vite.config.js',
          // Restart when package.json changes (dependencies)
          'package.json',
          // Restart when demo data configurations change
          'src/lib/mockData/*.js',
          'src/lib/services/demoDataGenerator.ts',
        ],
      }),
    ],
    optimizeDeps: {
      // Force Vite to always check @thepia packages for changes
      // This ensures local package updates are picked up immediately
      exclude: [
        '@thepia/flows-auth',
        '@thepia/flows-client',
        // Exclude Node.js-only testing frameworks from browser bundle
        'playwright-core',
        'playwright',
        '@playwright/test',
        'tmp',
      ],
    },
    resolve: {
      alias: {
        // Exclude Node.js-only dependencies from browser bundle
        tmp: path.resolve(__dirname, 'src/lib/empty.js'),
        crypto: path.resolve(__dirname, 'src/lib/empty.js'),
      },
    },

    server: {
      host: 'dev.thepia.net',
      port: 5179,
      strictPort: true,
      https: {
        key: './certs/dev.thepia.net-key.pem',
        cert: './certs/dev.thepia.net.pem',
      },
      hmr: {
        port: 5179,
        host: 'dev.thepia.net',
      },
    },
    define: {
      // Make environment variables available in the build
      'process.env.SUPABASE_URL': JSON.stringify(env.SUPABASE_URL),
      'process.env.SUPABASE_SERVICE_ROLE_KEY': JSON.stringify(env.SUPABASE_SERVICE_ROLE_KEY),
      // Provide crypto global for Web Crypto API usage in flows-auth
      global: 'globalThis',
    },

    build: {
      // Remove custom rollup options that conflict with SvelteKit static adapter
      // The service worker is copied separately via copy:sw script
    },
  };
});
