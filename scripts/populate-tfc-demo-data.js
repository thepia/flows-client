#!/usr/bin/env node

/**
 * Populate TFC Demo Data
 *
 * Creates realistic TFC (Thepia Flow Credits) financial data for demo companies
 * including purchases, usage, balances, contacts, and invoices
 */

import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  db: {
    schema: 'api',
  },
});

// Company-specific configurations
const COMPANY_CONFIGS = {
  'hygge-hvidlog': {
    name: 'Hygge & Hvidløg A/S',
    monthlyUsage: { min: 45, max: 60, seasonal_peak: 100 },
    purchasePattern: 'quarterly',
    bulkSize: { min: 200, max: 250 },
    autoReplenishThreshold: 50,
    autoReplenishAmount: 200,
    preferredCurrency: 'EUR',
    averageTenure: 4.2,
    contacts: [
      {
        first_name: 'Sarah',
        last_name: 'Johansen',
        email: 'sarah.johansen@hyggehvidlog.dk',
        job_title: 'Chief People Officer',
        department: 'Human Resources',
        contact_type: 'primary',
        is_primary_contact: true,
        can_purchase_credits: true,
        can_view_billing: true,
        can_manage_users: true,
        preferred_language: 'en',
      },
      {
        first_name: 'Lars',
        last_name: 'Nielsen',
        email: 'lars.nielsen@hyggehvidlog.dk',
        job_title: 'IT Director',
        department: 'Information Technology',
        contact_type: 'technical',
        can_manage_users: true,
        preferred_language: 'en',
      },
      {
        first_name: 'Maria',
        last_name: 'Andersen',
        email: 'maria.andersen@hyggehvidlog.dk',
        job_title: 'HR Operations Manager',
        department: 'Human Resources',
        contact_type: 'admin',
        preferred_language: 'en',
      },
    ],
  },
  'meridian-brands': {
    name: 'Meridian Brands International',
    monthlyUsage: { min: 400, max: 500, seasonal_peak: 800 },
    purchasePattern: 'annual_with_topups',
    annualPurchase: 5000,
    quarterlyTopup: { min: 500, max: 1000 },
    autoReplenishThreshold: 500,
    autoReplenishAmount: 1000,
    preferredCurrency: 'EUR',
    averageTenure: 2.8,
    contacts: [
      {
        first_name: 'Michael',
        last_name: 'Chen',
        email: 'michael.chen@meridianbrands.com',
        job_title: 'Global VP Human Resources',
        department: 'Human Resources',
        contact_type: 'primary',
        is_primary_contact: true,
        can_purchase_credits: true,
        can_view_billing: true,
        can_manage_users: true,
        preferred_language: 'en',
      },
      {
        first_name: 'Jennifer',
        last_name: 'Williams',
        email: 'jennifer.williams@meridianbrands.com',
        job_title: 'Finance Director, HR Operations',
        department: 'Finance',
        contact_type: 'billing',
        can_purchase_credits: true,
        can_view_billing: true,
        preferred_language: 'en',
      },
      {
        first_name: 'Yuki',
        last_name: 'Tanaka',
        email: 'yuki.tanaka@meridianbrands.com',
        job_title: 'Regional HR Director - APAC',
        department: 'Human Resources',
        contact_type: 'admin',
        preferred_language: 'en',
      },
      {
        first_name: 'Klaus',
        last_name: 'Mueller',
        email: 'klaus.mueller@meridianbrands.com',
        job_title: 'Regional HR Director - EMEA',
        department: 'Human Resources',
        contact_type: 'admin',
        preferred_language: 'en',
      },
      {
        first_name: 'Carlos',
        last_name: 'Rodriguez',
        email: 'carlos.rodriguez@meridianbrands.com',
        job_title: 'Regional HR Director - Americas',
        department: 'Human Resources',
        contact_type: 'admin',
        preferred_language: 'en',
      },
    ],
  },
};

// Helper function to calculate TFC pricing
function calculateTFCPricing(creditAmount) {
  let tier = 'individual';
  let discountPercentage = 0;
  let pricePerCredit = 150.0;

  if (creditAmount >= 2500) {
    tier = 'bulk_tier_2';
    discountPercentage = 30.0;
    pricePerCredit = 105.0;
  } else if (creditAmount >= 500) {
    tier = 'bulk_tier_1';
    discountPercentage = 25.0;
    pricePerCredit = 112.5;
  }

  return {
    tier,
    discountPercentage,
    pricePerCredit,
    totalAmount: creditAmount * pricePerCredit,
    discountAmount: creditAmount * (150.0 - pricePerCredit),
  };
}

// Generate realistic usage patterns
function generateMonthlyUsagePattern(baseMin, baseMax, month) {
  // Add seasonal variations
  const seasonalFactors = {
    1: 0.8, // January - slow start
    2: 0.9, // February
    3: 1.0, // March
    4: 1.1, // April - spring hiring
    5: 1.1, // May
    6: 1.0, // June
    7: 0.9, // July - summer slowdown
    8: 0.8, // August - vacation period
    9: 1.2, // September - fall hiring
    10: 1.3, // October - Q4 ramp up
    11: 1.2, // November
    12: 0.7, // December - holiday slowdown
  };

  const factor = seasonalFactors[month] || 1.0;
  const min = Math.floor(baseMin * factor);
  const max = Math.floor(baseMax * factor);

  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Create account contacts
async function createAccountContacts(clientId, contacts) {
  console.log(`Creating ${contacts.length} account contacts...`);

  for (const contact of contacts) {
    const { error } = await supabase.from('account_contacts').insert({
      client_id: clientId,
      ...contact,
      status: 'active',
      email_verified: true,
      created_at: new Date(Date.now() - 730 * 24 * 60 * 60 * 1000).toISOString(), // 2 years ago
    });

    if (error) {
      console.error('Error creating contact:', error);
    }
  }

  // Get created contacts for reference
  const { data: createdContacts } = await supabase
    .from('account_contacts')
    .select('*')
    .eq('client_id', clientId);

  return createdContacts || [];
}

// Create admin access records
async function createAdminAccess(clientId, contacts) {
  console.log('Creating admin access records...');

  for (const contact of contacts) {
    const accessLevel =
      contact.contact_type === 'primary'
        ? 'owner'
        : contact.contact_type === 'billing'
          ? 'billing_only'
          : 'admin';

    const { error } = await supabase.from('admin_access').insert({
      client_id: clientId,
      contact_id: contact.id,
      access_level: accessLevel,
      can_purchase_credits: contact.can_purchase_credits || false,
      can_view_billing: contact.can_view_billing || false,
      can_view_usage_analytics: contact.can_view_usage_analytics || false,
      can_manage_account_settings: contact.contact_type === 'primary',
      can_manage_users: contact.can_manage_users || false,
      can_initiate_workflows: contact.can_initiate_workflows || false,
      can_view_credit_transactions: contact.can_view_credit_transactions || false,
      status: 'active',
      granted_at: new Date(Date.now() - 730 * 24 * 60 * 60 * 1000).toISOString(),
    });

    if (error) {
      console.error('Error creating admin access:', error);
    }
  }
}

// Generate TFC purchase history
async function generatePurchaseHistory(clientId, config, primaryContact, billingContact) {
  console.log('Generating TFC purchase history...');

  const purchases = [];
  const startDate = new Date(Date.now() - 730 * 24 * 60 * 60 * 1000); // 2 years ago
  let currentDate = new Date(startDate);

  // Initial purchase (always bulk for discount)
  const initialAmount =
    config.purchasePattern === 'annual_with_topups' ? config.annualPurchase : 500;
  const initialPricing = calculateTFCPricing(initialAmount);

  // Create initial payment
  const { data: initialPayment } = await supabase
    .from('tfc_payments')
    .insert({
      client_id: clientId,
      contact_id: billingContact?.id || primaryContact.id,
      payment_amount: initialPricing.totalAmount,
      currency: config.preferredCurrency,
      payment_method: 'bank_transfer',
      payment_gateway: 'manual',
      payment_status: 'completed',
      initiated_at: currentDate.toISOString(),
      completed_at: new Date(currentDate.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      invoice_number: `INV-${currentDate.getFullYear()}-001`,
      payment_description: `Initial TFC Purchase - ${initialAmount} credits`,
      created_at: currentDate.toISOString(),
    })
    .select()
    .single();

  if (initialPayment) {
    // Create initial purchase transaction
    await supabase.from('tfc_credit_transactions').insert({
      client_id: clientId,
      transaction_type: 'purchase',
      credit_amount: initialAmount,
      price_per_credit: initialPricing.pricePerCredit,
      total_amount: initialPricing.totalAmount,
      currency: config.preferredCurrency,
      base_price_per_credit: 150.0,
      bulk_discount_tier: initialPricing.tier,
      discount_percentage: initialPricing.discountPercentage,
      discount_amount: initialPricing.discountAmount,
      payment_id: initialPayment.id,
      description: `TFC Credit Purchase: ${initialAmount} credits with ${initialPricing.discountPercentage}% bulk discount`,
      created_by: 'demo_system',
      approved_by: primaryContact.id,
      approved_at: initialPayment.completed_at,
      created_at: currentDate.toISOString(),
    });

    purchases.push({ date: currentDate, amount: initialAmount, type: 'purchase' });
  }

  // Generate subsequent purchases based on pattern
  currentDate = new Date(startDate);
  currentDate.setMonth(currentDate.getMonth() + 3); // Start after initial purchase

  while (currentDate < new Date()) {
    if (config.purchasePattern === 'quarterly') {
      // Quarterly bulk purchases
      if (currentDate.getMonth() % 3 === 0) {
        const amount =
          Math.floor(Math.random() * (config.bulkSize.max - config.bulkSize.min + 1)) +
          config.bulkSize.min;
        const pricing = calculateTFCPricing(amount);

        const { data: payment } = await supabase
          .from('tfc_payments')
          .insert({
            client_id: clientId,
            contact_id: billingContact?.id || primaryContact.id,
            payment_amount: pricing.totalAmount,
            currency: config.preferredCurrency,
            payment_method: 'bank_transfer',
            payment_gateway: 'manual',
            payment_status: 'completed',
            initiated_at: currentDate.toISOString(),
            completed_at: new Date(currentDate.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
            invoice_number: `INV-${currentDate.getFullYear()}-${String(Math.floor(currentDate.getMonth() / 3) + 1).padStart(3, '0')}`,
            payment_description: `Quarterly TFC Purchase - ${amount} credits`,
            created_at: currentDate.toISOString(),
          })
          .select()
          .single();

        if (payment) {
          await supabase.from('tfc_credit_transactions').insert({
            client_id: clientId,
            transaction_type: 'purchase',
            credit_amount: amount,
            price_per_credit: pricing.pricePerCredit,
            total_amount: pricing.totalAmount,
            currency: config.preferredCurrency,
            base_price_per_credit: 150.0,
            bulk_discount_tier: pricing.tier,
            discount_percentage: pricing.discountPercentage,
            discount_amount: pricing.discountAmount,
            payment_id: payment.id,
            description: `Quarterly TFC Purchase: ${amount} credits`,
            created_by: 'demo_system',
            created_at: currentDate.toISOString(),
          });

          purchases.push({ date: new Date(currentDate), amount, type: 'purchase' });
        }
      }
    } else if (config.purchasePattern === 'annual_with_topups') {
      // Annual purchases
      if (
        currentDate.getMonth() === startDate.getMonth() &&
        currentDate.getDate() === startDate.getDate()
      ) {
        const pricing = calculateTFCPricing(config.annualPurchase);

        const { data: payment } = await supabase
          .from('tfc_payments')
          .insert({
            client_id: clientId,
            contact_id: billingContact?.id || primaryContact.id,
            payment_amount: pricing.totalAmount,
            currency: config.preferredCurrency,
            payment_method: 'purchase_order',
            payment_gateway: 'manual',
            payment_status: 'completed',
            initiated_at: currentDate.toISOString(),
            completed_at: new Date(currentDate.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(),
            invoice_number: `INV-${currentDate.getFullYear()}-ANNUAL`,
            reference_number: `PO-${currentDate.getFullYear()}-HR-001`,
            payment_description: `Annual TFC Contract - ${config.annualPurchase} credits`,
            created_at: currentDate.toISOString(),
          })
          .select()
          .single();

        if (payment) {
          await supabase.from('tfc_credit_transactions').insert({
            client_id: clientId,
            transaction_type: 'purchase',
            credit_amount: config.annualPurchase,
            price_per_credit: pricing.pricePerCredit,
            total_amount: pricing.totalAmount,
            currency: config.preferredCurrency,
            base_price_per_credit: 150.0,
            bulk_discount_tier: pricing.tier,
            discount_percentage: pricing.discountPercentage,
            discount_amount: pricing.discountAmount,
            payment_id: payment.id,
            description: `Annual TFC Contract Purchase: ${config.annualPurchase} credits`,
            created_by: 'demo_system',
            approved_by: primaryContact.id,
            approved_at: payment.completed_at,
            created_at: currentDate.toISOString(),
          });

          purchases.push({
            date: new Date(currentDate),
            amount: config.annualPurchase,
            type: 'purchase',
          });
        }
      }

      // Quarterly top-ups
      if ((currentDate.getMonth() + 1) % 3 === 0) {
        const amount =
          Math.floor(Math.random() * (config.quarterlyTopup.max - config.quarterlyTopup.min + 1)) +
          config.quarterlyTopup.min;
        const pricing = calculateTFCPricing(amount);

        const { data: payment } = await supabase
          .from('tfc_payments')
          .insert({
            client_id: clientId,
            contact_id: billingContact?.id || primaryContact.id,
            payment_amount: pricing.totalAmount,
            currency: config.preferredCurrency,
            payment_method: 'credit_card',
            payment_gateway: 'stripe',
            payment_status: 'completed',
            initiated_at: currentDate.toISOString(),
            completed_at: currentDate.toISOString(),
            gateway_transaction_id: `ch_${crypto.randomBytes(12).toString('hex')}`,
            payment_description: `TFC Top-up Purchase - ${amount} credits`,
            created_at: currentDate.toISOString(),
          })
          .select()
          .single();

        if (payment) {
          await supabase.from('tfc_credit_transactions').insert({
            client_id: clientId,
            transaction_type: 'purchase',
            credit_amount: amount,
            price_per_credit: pricing.pricePerCredit,
            total_amount: pricing.totalAmount,
            currency: config.preferredCurrency,
            base_price_per_credit: 150.0,
            bulk_discount_tier: pricing.tier,
            discount_percentage: pricing.discountPercentage,
            discount_amount: pricing.discountAmount,
            payment_id: payment.id,
            description: `Quarterly TFC Top-up: ${amount} credits`,
            created_by: 'auto_replenish',
            created_at: currentDate.toISOString(),
          });

          purchases.push({ date: new Date(currentDate), amount, type: 'purchase' });
        }
      }
    }

    currentDate.setMonth(currentDate.getMonth() + 1);
  }

  return purchases;
}

// Generate TFC usage history
async function generateUsageHistory(clientId, config, _purchases) {
  console.log('Generating TFC usage history...');

  const usageTransactions = [];
  const startDate = new Date(Date.now() - 730 * 24 * 60 * 60 * 1000); // 2 years ago
  const currentDate = new Date(startDate);
  currentDate.setDate(currentDate.getDate() + 7); // Start usage a week after first purchase

  // Department distribution for realistic usage
  const departments = [
    { name: 'Engineering', weight: 0.3 },
    { name: 'Sales', weight: 0.25 },
    { name: 'Marketing', weight: 0.15 },
    { name: 'Operations', weight: 0.15 },
    { name: 'Finance', weight: 0.08 },
    { name: 'HR', weight: 0.07 },
  ];

  const workflowTypes = [
    { type: 'onboarding', weight: 0.55 },
    { type: 'offboarding', weight: 0.45 },
  ];

  while (currentDate < new Date()) {
    const month = currentDate.getMonth() + 1;
    const monthlyUsage = generateMonthlyUsagePattern(
      config.monthlyUsage.min,
      config.monthlyUsage.max,
      month
    );

    // Distribute usage across the month
    for (let i = 0; i < monthlyUsage; i++) {
      const usageDate = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        Math.floor(Math.random() * 28) + 1
      );

      // Skip weekends mostly
      if (usageDate.getDay() === 0 || usageDate.getDay() === 6) {
        if (Math.random() > 0.1) continue; // 90% skip weekends
      }

      // Determine department and workflow type
      const dept = weightedRandom(departments);
      const workflowType = weightedRandom(workflowTypes);

      // Create usage transaction
      const { data: transaction } = await supabase
        .from('tfc_credit_transactions')
        .insert({
          client_id: clientId,
          transaction_type: 'usage',
          credit_amount: -1, // Always -1 for usage
          price_per_credit: 150.0, // Rate at time of usage
          total_amount: -150.0,
          currency: config.preferredCurrency,
          workflow_type: workflowType.type,
          workflow_id: crypto.randomUUID(),
          employee_uid: `emp_${crypto.randomBytes(6).toString('hex')}`,
          description: `${workflowType.type === 'onboarding' ? 'Onboarding' : 'Offboarding'} process initiated`,
          created_by: 'workflow_system',
          created_at: usageDate.toISOString(),
        })
        .select()
        .single();

      if (transaction) {
        // Create corresponding workflow usage record
        await supabase.from('tfc_workflow_usage').insert({
          client_id: clientId,
          workflow_id: transaction.workflow_id,
          workflow_type: workflowType.type,
          employee_uid: transaction.employee_uid,
          credits_consumed: 1,
          credit_rate: 150.0,
          total_cost: 150.0,
          currency: config.preferredCurrency,
          pricing_tier: 'individual', // Usage is always at individual rate
          consumed_at: usageDate.toISOString(),
          workflow_initiated_at: usageDate.toISOString(),
          credit_transaction_id: transaction.id,
          workflow_status: 'completed',
          workflow_completion_success: Math.random() > 0.05, // 95% success rate
          department_category: dept.name,
          seniority_level: ['junior', 'mid', 'senior', 'lead', 'executive'][
            Math.floor(Math.random() * 5)
          ],
          workflow_complexity: ['simple', 'standard', 'complex'][Math.floor(Math.random() * 3)],
          created_at: usageDate.toISOString(),
        });

        usageTransactions.push({ date: usageDate, type: 'usage' });
      }
    }

    currentDate.setMonth(currentDate.getMonth() + 1);
  }

  return usageTransactions;
}

// Generate invoices
async function generateInvoices(clientId, config, billingContact) {
  console.log('Generating invoices...');

  // Get all payments for this client
  const { data: payments } = await supabase
    .from('tfc_payments')
    .select('*')
    .eq('client_id', clientId)
    .eq('payment_status', 'completed')
    .order('completed_at', { ascending: true });

  if (!payments) return;

  // Group payments by month
  const paymentsByMonth = {};
  for (const payment of payments) {
    const date = new Date(payment.completed_at);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!paymentsByMonth[key]) {
      paymentsByMonth[key] = [];
    }
    paymentsByMonth[key].push(payment);
  }

  // Create monthly invoices
  for (const [monthKey, monthPayments] of Object.entries(paymentsByMonth)) {
    const [year, month] = monthKey.split('-');
    const invoiceDate = new Date(Number.parseInt(year, 10), Number.parseInt(month, 10) - 1, 15); // Mid-month

    const lineItems = monthPayments.map((payment) => ({
      description: payment.payment_description,
      quantity: 1,
      rate: payment.payment_amount,
      amount: payment.payment_amount,
    }));

    const subtotal = monthPayments.reduce((sum, p) => sum + Number.parseFloat(p.payment_amount), 0);
    const taxRate = config.preferredCurrency === 'EUR' ? 0.19 : 0.077; // 19% VAT or 7.7% Swiss VAT
    const taxAmount = subtotal * taxRate;
    const totalAmount = subtotal + taxAmount;

    await supabase.from('tfc_invoices').insert({
      client_id: clientId,
      invoice_number: `${year}${month}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
      invoice_date: invoiceDate.toISOString(),
      due_date: new Date(invoiceDate.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      subtotal_amount: subtotal.toFixed(2),
      tax_amount: taxAmount.toFixed(2),
      total_amount: totalAmount.toFixed(2),
      currency: config.preferredCurrency,
      status: 'paid',
      payment_id: monthPayments[0].id, // Link to first payment of the month
      paid_at: monthPayments[monthPayments.length - 1].completed_at,
      paid_amount: totalAmount.toFixed(2),
      line_items: lineItems,
      billing_contact_id: billingContact?.id,
      sent_to_email: billingContact?.email,
      sent_at: new Date(invoiceDate.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      created_at: invoiceDate.toISOString(),
    });
  }
}

// Set up client balance
async function setupClientBalance(clientId, config, billingContact) {
  console.log('Setting up client balance...');

  // The balance will be automatically calculated by triggers, but we need to set preferences
  await supabase.from('tfc_client_balances').upsert({
    client_id: clientId,
    low_balance_threshold: 100,
    critical_balance_threshold: 50,
    auto_replenish_enabled: true,
    auto_replenish_threshold: config.autoReplenishThreshold,
    auto_replenish_amount: config.autoReplenishAmount,
    auto_replenish_payment_method: 'credit_card',
    preferred_currency: config.preferredCurrency,
    billing_contact_id: billingContact?.id,
    created_at: new Date(Date.now() - 730 * 24 * 60 * 60 * 1000).toISOString(),
  });
}

// Weighted random selection helper
function weightedRandom(items) {
  const weights = items.map((item) => item.weight);
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  let random = Math.random() * totalWeight;

  for (let i = 0; i < items.length; i++) {
    random -= weights[i];
    if (random <= 0) {
      return items[i];
    }
  }

  return items[items.length - 1];
}

// Main function to populate TFC data for a company
async function populateTFCDataForCompany(clientCode) {
  const config = COMPANY_CONFIGS[clientCode];
  if (!config) {
    console.error(`No configuration found for client: ${clientCode}`);
    return;
  }

  console.log(`\n🏢 Populating TFC data for ${config.name}...`);

  try {
    // Get client
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id')
      .eq('client_code', clientCode)
      .single();

    if (clientError || !client) {
      console.error('Could not find client:', clientError);
      return;
    }

    // Clear existing TFC data for clean demo
    console.log('Clearing existing TFC data...');
    await supabase.from('tfc_invoices').delete().eq('client_id', client.id);
    await supabase.from('tfc_workflow_usage').delete().eq('client_id', client.id);
    await supabase.from('tfc_credit_transactions').delete().eq('client_id', client.id);
    await supabase.from('tfc_payments').delete().eq('client_id', client.id);
    await supabase.from('admin_access').delete().eq('client_id', client.id);
    await supabase.from('account_contacts').delete().eq('client_id', client.id);
    await supabase.from('tfc_client_balances').delete().eq('client_id', client.id);

    console.log('Cleared existing data for clean demo');

    // Create account contacts
    const contacts = await createAccountContacts(client.id, config.contacts);
    const primaryContact = contacts.find((c) => c.is_primary_contact);
    const billingContact = contacts.find((c) => c.contact_type === 'billing') || primaryContact;

    // Create admin access
    await createAdminAccess(client.id, contacts);

    // Generate purchase history
    const purchases = await generatePurchaseHistory(
      client.id,
      config,
      primaryContact,
      billingContact
    );
    console.log(`Created ${purchases.length} purchase transactions`);

    // Generate usage history
    const usage = await generateUsageHistory(client.id, config, purchases);
    console.log(`Created ${usage.length} usage transactions`);

    // Generate invoices
    await generateInvoices(client.id, config, billingContact);

    // Set up client balance
    await setupClientBalance(client.id, config, billingContact);

    // Get final balance
    const { data: balance } = await supabase
      .from('tfc_client_balances')
      .select('*')
      .eq('client_id', client.id)
      .single();

    if (balance) {
      console.log(`\n✅ TFC data populated successfully for ${config.name}:`);
      console.log(`   - Total Purchased: ${balance.total_purchased} TFC`);
      console.log(`   - Total Used: ${balance.total_used} TFC`);
      console.log(`   - Current Balance: ${balance.current_balance} TFC`);
      console.log(`   - Available Credits: ${balance.available_credits} TFC`);
      console.log(`   - Total Spent: ${config.preferredCurrency} ${balance.total_spent}`);
      console.log(
        `   - Average Price: ${config.preferredCurrency} ${balance.average_credit_price} per TFC`
      );
    }
  } catch (error) {
    console.error('Error populating TFC data:', error);
  }
}

// Main execution
async function main() {
  console.log('🚀 Starting TFC demo data population...\n');

  // Populate data for both demo companies
  await populateTFCDataForCompany('hygge-hvidlog');
  await populateTFCDataForCompany('meridian-brands');

  console.log('\n✅ TFC demo data population complete!');
}

// Run the script
main();
