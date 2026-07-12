#!/usr/bin/env node

/**
 * CLI tool for managing Thepia admin users
 *
 * Usage:
 *   node scripts/manage-admin-users.js assign user@example.com
 *   node scripts/manage-admin-users.js remove user@example.com
 *   node scripts/manage-admin-users.js list
 *   node scripts/manage-admin-users.js check user@example.com
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env file');
  process.exit(1);
}

// Create Supabase client with service role (bypasses RLS)
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  db: { schema: 'api' },
});

async function assignAdminRole(email, notes = 'CLI assignment') {
  try {
    console.log(`🔄 Assigning thepia_staff role to ${email}...`);

    const { data, error } = await supabase.rpc('assign_thepia_staff_role', {
      target_user_email: email,
      assigner_notes: notes,
    });

    if (error) {
      console.error('❌ Error:', error.message);
      return false;
    }

    if (data && data.length > 0 && data[0].success) {
      console.log('✅ Success:', data[0].message);
      return true;
    } else {
      console.error('❌ Failed:', data[0]?.message || 'Unknown error');
      return false;
    }
  } catch (err) {
    console.error('❌ Exception:', err.message);
    return false;
  }
}

async function removeAdminRole(email) {
  try {
    console.log(`🔄 Removing role from ${email}...`);

    const { data, error } = await supabase.rpc('remove_user_role', {
      target_user_email: email,
    });

    if (error) {
      console.error('❌ Error:', error.message);
      return false;
    }

    if (data && data.length > 0 && data[0].success) {
      console.log('✅ Success:', data[0].message);
      return true;
    } else {
      console.error('❌ Failed:', data[0]?.message || 'Unknown error');
      return false;
    }
  } catch (err) {
    console.error('❌ Exception:', err.message);
    return false;
  }
}

async function listAdminUsers() {
  try {
    console.log('📋 Listing all admin users...\n');

    const { data, error } = await supabase.rpc('list_user_roles');

    if (error) {
      console.error('❌ Error:', error.message);
      return false;
    }

    if (!data || data.length === 0) {
      console.log('📝 No admin users found');
      return true;
    }

    console.log('Email                    | Role          | Assigned By          | Assigned At');
    console.log(
      '-------------------------|---------------|----------------------|--------------------'
    );

    for (const user of data) {
      const email = user.user_email.padEnd(24);
      const role = user.role.padEnd(13);
      const assignedBy = (user.assigned_by_email || 'System').padEnd(20);
      const assignedAt = new Date(user.assigned_at).toLocaleDateString();

      console.log(`${email} | ${role} | ${assignedBy} | ${assignedAt}`);
    }

    console.log(`\n📊 Total: ${data.length} admin users`);
    return true;
  } catch (err) {
    console.error('❌ Exception:', err.message);
    return false;
  }
}

async function checkUserRole(email) {
  try {
    console.log(`🔍 Checking role for ${email}...`);

    const { data, error } = await supabase.rpc('get_user_role', {
      check_user_email: email,
    });

    if (error) {
      console.error('❌ Error:', error.message);
      return false;
    }

    const role = data || 'authenticated';
    console.log(`📋 User ${email} has role: ${role}`);

    if (role === 'thepia_staff') {
      console.log('✅ User has admin access');
    } else {
      console.log('ℹ️  User does not have admin access');
    }

    return true;
  } catch (err) {
    console.error('❌ Exception:', err.message);
    return false;
  }
}

async function testConnection() {
  try {
    console.log('🔄 Testing Supabase connection...');

    // Test basic connection
    const { data, error } = await supabase.from('user_roles').select('count').limit(1);

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned, which is OK
      console.error('❌ Connection failed:', error.message);
      return false;
    }

    console.log('✅ Connection successful');
    return true;
  } catch (err) {
    console.error('❌ Connection exception:', err.message);
    return false;
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
🔧 Thepia Admin User Management CLI

Usage:
  node scripts/manage-admin-users.js <command> [email] [notes]

Commands:
  assign <email> [notes]    Assign thepia_staff role to user
  remove <email>            Remove admin role from user  
  list                      List all admin users
  check <email>             Check user's current role
  test                      Test database connection

Examples:
  node scripts/manage-admin-users.js assign admin@thepia.com "Initial admin"
  node scripts/manage-admin-users.js remove user@example.com
  node scripts/manage-admin-users.js list
  node scripts/manage-admin-users.js check admin@thepia.com
`);
    process.exit(0);
  }

  const command = args[0];
  const email = args[1];
  const notes = args[2];

  // Test connection first
  const connected = await testConnection();
  if (!connected) {
    process.exit(1);
  }

  let success = false;

  switch (command) {
    case 'assign':
      if (!email) {
        console.error('❌ Email address required for assign command');
        process.exit(1);
      }
      success = await assignAdminRole(email, notes);
      break;

    case 'remove':
      if (!email) {
        console.error('❌ Email address required for remove command');
        process.exit(1);
      }
      success = await removeAdminRole(email);
      break;

    case 'list':
      success = await listAdminUsers();
      break;

    case 'check':
      if (!email) {
        console.error('❌ Email address required for check command');
        process.exit(1);
      }
      success = await checkUserRole(email);
      break;

    case 'test':
      success = true; // Already tested connection above
      break;

    default:
      console.error(`❌ Unknown command: ${command}`);
      console.log('Use "node scripts/manage-admin-users.js" for usage help');
      process.exit(1);
  }

  process.exit(success ? 0 : 1);
}

main().catch((err) => {
  console.error('❌ Fatal error:', err.message);
  process.exit(1);
});
