// Disable SSR for the entire application
// This is required because flows-auth is a client-only library
export const ssr = false;

// Enable client-side routing
export const csr = true;

// Prerender the app as a static site
export const prerender = true;
