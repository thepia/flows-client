#!/usr/bin/env node

/**
 * Generate Missing TFC Invoices
 *
 * Creates invoices for existing TFC payments that don't have invoices yet
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  db: {
    schema: 'api',
  },
});

// Generate invoices for a client
async function generateInvoicesForClient(clientId, clientCode) {
  console.log(`\n🧾 Generating invoices for ${clientCode}...`);

  try {
    // Get all completed payments without invoices
    const { data: payments, error: paymentsError } = await supabase
      .from('tfc_payments')
      .select('*')
      .eq('client_id', clientId)
      .eq('payment_status', 'completed')
      .order('completed_at', { ascending: true });

    if (paymentsError) {
      console.error('Error fetching payments:', paymentsError);
      return;
    }

    if (!payments || payments.length === 0) {
      console.log('  No payments found');
      return;
    }

    // Get billing contact
    const { data: billingContact } = await supabase
      .from('account_contacts')
      .select('*')
      .eq('client_id', clientId)
      .eq('is_primary_contact', true)
      .single();

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

    console.log(
      `  Found ${payments.length} payments in ${Object.keys(paymentsByMonth).length} months`
    );

    // Create invoices for each month
    let invoicesCreated = 0;
    for (const [monthKey, monthPayments] of Object.entries(paymentsByMonth)) {
      const [year, month] = monthKey.split('-');
      const invoiceDate = new Date(Number.parseInt(year, 10), Number.parseInt(month, 10) - 1, 15); // Mid-month

      const lineItems = monthPayments.map((payment) => ({
        description:
          payment.payment_description ||
          `TFC Purchase - ${payment.payment_amount} ${payment.currency}`,
        quantity: 1,
        rate: Number.parseFloat(payment.payment_amount),
        amount: Number.parseFloat(payment.payment_amount),
      }));

      const subtotal = monthPayments.reduce(
        (sum, p) => sum + Number.parseFloat(p.payment_amount),
        0
      );
      const currency = monthPayments[0].currency || 'EUR';
      const taxRate = currency === 'EUR' ? 0.19 : 0.077; // 19% VAT or 7.7% Swiss VAT
      const taxAmount = subtotal * taxRate;
      const totalAmount = subtotal + taxAmount;

      // Check if invoice already exists for this month
      const { data: existingInvoice } = await supabase
        .from('tfc_invoices')
        .select('id')
        .eq('client_id', clientId)
        .gte('invoice_date', `${year}-${month}-01`)
        .lt('invoice_date', `${year}-${String(Number.parseInt(month, 10) + 1).padStart(2, '0')}-01`)
        .single();

      if (existingInvoice) {
        console.log(`  ⏭️  Invoice already exists for ${monthKey}`);
        continue;
      }

      const { error: invoiceError } = await supabase.from('tfc_invoices').insert({
        client_id: clientId,
        invoice_number: `${year}${month}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
        invoice_date: invoiceDate.toISOString().split('T')[0], // Date only
        due_date: new Date(invoiceDate.getTime() + 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
        subtotal_amount: subtotal.toFixed(2),
        tax_amount: taxAmount.toFixed(2),
        total_amount: totalAmount.toFixed(2),
        currency: currency,
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

      if (invoiceError) {
        console.error(`  ❌ Error creating invoice for ${monthKey}:`, invoiceError);
      } else {
        console.log(`  ✅ Created invoice for ${monthKey}: ${currency} ${totalAmount.toFixed(2)}`);
        invoicesCreated++;
      }
    }

    console.log(`  📊 Created ${invoicesCreated} invoices`);
  } catch (error) {
    console.error(`Error generating invoices for ${clientCode}:`, error);
  }
}

// Main execution
async function main() {
  console.log('🚀 Generating missing TFC invoices...\n');

  // Get demo clients
  const { data: clients, error: clientsError } = await supabase
    .from('clients')
    .select('*')
    .in('client_code', ['hygge-hvidlog', 'meridian-brands']);

  if (clientsError) {
    console.error('Error fetching clients:', clientsError);
    return;
  }

  for (const client of clients || []) {
    await generateInvoicesForClient(client.id, client.client_code);
  }

  console.log('\n✅ Invoice generation complete!');
}

// Run the script
main();
