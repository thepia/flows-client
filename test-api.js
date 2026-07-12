#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function testAPI() {
  console.log('🧪 Testing API access...');

  try {
    // Test with explicit schema setting
    console.log('Testing with explicit api schema...');
    const supabaseWithSchema = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
        db: {
          schema: 'api',
        },
      }
    );

    // Test clients table
    console.log('Testing clients table...');
    const { data: clients, error: clientError } = await supabaseWithSchema
      .from('clients')
      .select('client_code, legal_name')
      .limit(5);

    if (clientError) {
      console.error('❌ Clients error:', clientError);
    } else {
      console.log('✅ Clients table accessible:', clients?.length || 0, 'records');
      for (const c of clients) {
        console.log(`  • ${c.client_code}: ${c.legal_name}`);
      }
    }

    // Test people table
    console.log('\nTesting people table...');
    const { data: people, error: peopleError } = await supabaseWithSchema
      .from('people')
      .select('person_code, first_name, last_name')
      .limit(3);

    if (peopleError) {
      console.error('❌ People error:', peopleError);
    } else {
      console.log('✅ People table accessible:', people?.length || 0, 'records');
      for (const p of people) {
        console.log(`  • ${p.person_code}: ${p.first_name} ${p.last_name}`);
      }
    }
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testAPI();
