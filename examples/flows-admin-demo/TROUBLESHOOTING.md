# flows-admin-demo Troubleshooting Guide

This guide helps resolve common issues with the flows-admin-demo application.

## 🔧 Quick Fix for Common Issues

### 1. **Missing Supabase Token Error**
```
hasSupabaseToken: false, supabaseTokenPreview: 'undefined...'
```

**Solution**: The demo now correctly uses only `supabase_token` for database access. If this token is missing, the client will use anonymous access. The `access_token` is never used for Supabase (it's for WorkOS/Auth0 API access only).

### 2. **Database Configuration Parameter Error**
```
Error: unrecognized configuration parameter "app.current_client_id"
Could not find the function api.get_current_client_id without parameters
```

**Solution**: Set up RLS functions using the flows-db library command:

**Option A: Using flows-db Script (Recommended)**
```bash
# From flows-db root directory
cd ../..  # Go to flows-db root
pnpm db:setup-rls
```

**Option B: Manual SQL (if you have psql access)**
```bash
psql -h jstbkvkurjsopuwhlsvy.supabase.co -U postgres -d postgres -f schemas/26_fix_rls_configuration.sql
```

**Note**: The flows-db library already has the required `SUPABASE_SERVICE_ROLE_KEY` in its `.env` file.

### 3. **Client Data Not Found**
```
Client hygge-hvidlog not found, trying default: hygge-hvidlog
```

**Solution**: Set up demo data:
```bash
cd examples/flows-admin-demo
pnpm setup:demo
```

### 4. **Multiple GoTrueClient Instances**
```
Multiple GoTrueClient instances detected in the same browser context
```

**Solution**: This has been fixed with singleton pattern. Clear browser cache and restart.

### 5. **SSR Errors with flows-auth**
```
Error when evaluating SSR module: transport was disconnected, cannot call "fetchModule"
```

**Solution**: The demo now uses `@sveltejs/adapter-static` and disables SSR completely. This is required because flows-auth is a client-only library.

## 🚀 Complete Setup Process

### Step 1: Database Setup

1. **Apply the RLS configuration fix**:
```bash
# From the flows-db root directory
psql -h your-supabase-host -U postgres -d postgres -f schemas/26_fix_rls_configuration.sql
```

2. **Set up demo data**:
```bash
cd examples/flows-admin-demo
pnpm setup:demo
```

### Step 2: Environment Configuration

Ensure your `.env` file contains:
```bash
SUPABASE_URL=https://jstbkvkurjsopuwhlsvy.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
VITE_SUPABASE_URL=https://jstbkvkurjsopuwhlsvy.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### Step 3: Start the Application

```bash
cd examples/flows-admin-demo
pnpm dev
```

## 🔍 Debugging Tips

### Check Auth Store State
Open browser console and run:
```javascript
// Check auth store state
console.log('Auth Store:', window.authStore?.getState());

// Check if user is authenticated
console.log('Is Authenticated:', window.authStore?.getState()?.state === 'authenticated');

// Check tokens
const state = window.authStore?.getState();
console.log('Tokens:', {
  access_token: state?.access_token ? 'Present' : 'Missing',
  supabase_token: state?.supabase_token ? 'Present' : 'Missing'
});
```

### Check Database Connection
```javascript
// Test Supabase connection
const { data, error } = await supabase.from('clients').select('*').limit(1);
console.log('Database test:', { data, error });
```

### Verify Client Context
```javascript
// Check if client context is set
const { data, error } = await supabase.rpc('get_current_client_id');
console.log('Current client ID:', { data, error });
```

## 📋 Common Error Messages and Solutions

### Error: "Auth store not available in context"
**Cause**: Component trying to access auth store before it's initialized.
**Solution**: Ensure `setupAuthContext()` is called in `+layout.svelte` before components load.

### Error: "JSON object requested, multiple (or no) rows returned"
**Cause**: Database query expecting single row but getting multiple or zero rows.
**Solution**: Run `pnpm setup:demo` to ensure demo data exists.

### Error: "Failed to load client data"
**Cause**: RLS policies blocking access or missing client data.
**Solution**: 
1. Apply schema fix: `schemas/26_fix_rls_configuration.sql`
2. Set up demo data: `pnpm setup:demo`

### Error: "Token was refreshed 0s ago"
**Cause**: Token refresh happening too frequently.
**Solution**: This is a warning, not an error. The system is working correctly.

## 🔄 Reset and Clean Start

If issues persist, try a complete reset:

```bash
# 1. Clear browser data
# - Open DevTools > Application > Storage > Clear site data

# 2. Reset database (if you have admin access)
# - Drop and recreate the demo client data

# 3. Restart development server
cd examples/flows-admin-demo
pnpm dev
```

## 📞 Getting Help

If you're still experiencing issues:

1. **Check the console logs** for specific error messages
2. **Verify environment variables** are correctly set
3. **Ensure database schema** is up to date
4. **Test with a fresh browser session** (incognito mode)

## 🧪 Testing the Fix

After applying fixes, verify everything works:

```bash
# 1. Start the demo
cd examples/flows-admin-demo
pnpm dev

# 2. Open browser to http://localhost:5173

# 3. Check console for these success messages:
# ✅ "Auth store initialized in layout with database persistence"
# ✅ "Created Supabase client with auth: {hasValidToken: true}"
# ✅ "Set app.current_client_id for RLS policies"

# 4. Verify data loads without errors:
# - Client data should load
# - Notifications should appear
# - No 406 or 400 errors in network tab
```

## 📝 Notes

- The demo uses the `hygge-hvidlog` client by default
- RLS policies require proper client context to be set
- Auth tokens are used for database access with Row Level Security
- The application gracefully handles missing data with fallbacks
