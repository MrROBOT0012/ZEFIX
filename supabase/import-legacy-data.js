/**
 * One-time legacy data import: Zelaya_Co_Master_Bookkeeping.xlsx -> Supabase
 *
 * Run this ONCE, after the Phase 1 schema (companies, customers, jobs, invoices,
 * payments, expenses) exists in Supabase. Not part of the ongoing Excel sync
 * (lib/excel.ts) — this is a single one-direction migration and is NOT idempotent:
 * running it twice will insert duplicate customers/jobs/invoices/expenses.
 *
 * Usage (run from the zelaya-finance/ directory, so it picks up the project's
 * already-installed exceljs and @supabase/supabase-js):
 *   node --env-file=.env.local supabase/import-legacy-data.js path/to/Zelaya_Co_Master_Bookkeeping.xlsx
 *
 * Requires .env.local with:
 *   NEXT_PUBLIC_SUPABASE_URL=...
 *   SUPABASE_SERVICE_ROLE_KEY=...   (service role, not anon key — this script bypasses RLS)
 *
 * Review the console output at the end before trusting the data. This script
 * is intentionally verbose about what it skips and why.
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const ExcelJS = require('exceljs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const COMPANY_LEGAL_NAME = 'Zelaya & Co. LLC';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Usage: node --env-file=.env.local supabase/import-legacy-data.js path/to/workbook.xlsx');
    process.exit(1);
  }

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);

  // ---- 1. Get or create the company row ----
  let { data: company } = await supabase
    .from('companies')
    .select('id')
    .eq('legal_name', COMPANY_LEGAL_NAME)
    .maybeSingle();

  if (!company) {
    const { data, error } = await supabase
      .from('companies')
      .insert({ legal_name: COMPANY_LEGAL_NAME, business_type: 'services' })
      .select('id')
      .single();
    if (error) throw error;
    company = data;
    console.log(`Created company row: ${COMPANY_LEGAL_NAME}`);
  }
  const companyId = company.id;

  // ---- 2. Customers (Customers_Vendors sheet, Type = "Customer" only) ----
  const custSheet = wb.getWorksheet('Customers_Vendors');
  const customerIdByName = {}; // name -> uuid, for linking jobs/invoices/expenses later
  const skippedVendors = [];

  custSheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return; // header
    const [_, name, type, contact, email, phone, address, notes] = row.values;
    if (!name) return;

    if (type === 'Vendor') {
      skippedVendors.push(name);
      return; // vendors aren't imported as customer records — see mapping notes
    }

    // defer actual insert to async block below
    customerIdByName[name] = { name, contact, email, phone, address, notes };
  });

  for (const name of Object.keys(customerIdByName)) {
    const c = customerIdByName[name];
    const { data, error } = await supabase
      .from('customers')
      .insert({
        company_id: companyId,
        name: c.name,
        contact_person: c.contact || null,
        email: c.email || null,
        phone: c.phone || null,
        billing_address: c.address || null,
        notes: c.notes || null,
      })
      .select('id')
      .single();
    if (error) throw error;
    customerIdByName[name] = data.id; // replace object with uuid
  }
  console.log(`Imported ${Object.keys(customerIdByName).length} customers.`);
  console.log(`Skipped ${skippedVendors.length} vendor records (not customers): ${skippedVendors.join(', ')}`);

  // ---- 3. Jobs ----
  const jobsSheet = wb.getWorksheet('Jobs');
  const jobIdByOldId = {}; // old "JOB-0001" style id -> new uuid
  const jobIdByName = {};  // job name -> new uuid (Transactions/Invoices reference by job name)

  const jobRows = [];
  jobsSheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;
    const v = row.values;
    const [_, oldJobId, customerName, jobName, location, startDate, status, quotedAmount, , , , , notes] = v;
    if (!oldJobId) return;
    jobRows.push({ oldJobId, customerName, jobName, location, startDate, status, quotedAmount, notes });
  });

  for (const j of jobRows) {
    const customerId = customerIdByName[j.customerName] || null;
    if (!customerId) {
      console.warn(`Job "${j.jobName}": customer "${j.customerName}" not found in imported customers — job will have no customer link.`);
    }
    const statusMap = { 'In Progress': 'in_progress', 'Completed': 'completed', 'Active': 'active', 'On Hold': 'on_hold' };
    const { data, error } = await supabase
      .from('jobs')
      .insert({
        company_id: companyId,
        customer_id: customerId,
        job_name: j.jobName,
        location: j.location || null,
        start_date: j.startDate || null,
        status: statusMap[j.status] || 'active',
        quoted_amount: j.quotedAmount || null,
        notes: [j.notes, `Legacy ID: ${j.oldJobId}`].filter(Boolean).join(' | '),
      })
      .select('id')
      .single();
    if (error) throw error;
    jobIdByOldId[j.oldJobId] = data.id;
    jobIdByName[j.jobName] = data.id;
  }
  console.log(`Imported ${jobRows.length} jobs.`);

  // ---- 4. Invoices + matching payments (Invoices_AR — all currently Paid) ----
  const invSheet = wb.getWorksheet('Invoices_AR');
  const invoiceRows = [];
  invSheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;
    const v = row.values;
    const [_, invDate, invNum, customer, job, description, dueDate, invAmount, amountPaid, balanceDue, status, paymentDate, notes] = v;
    if (!invNum) return;
    invoiceRows.push({ invDate, invNum, customer, job, description, dueDate, invAmount, amountPaid, balanceDue, status, paymentDate, notes });
  });

  let invoiceCount = 0, paymentCount = 0;
  for (const inv of invoiceRows) {
    const customerId = customerIdByName[inv.customer] || null;
    const jobId = jobIdByName[inv.job] || null;
    if (!customerId) console.warn(`Invoice ${inv.invNum}: customer "${inv.customer}" not found.`);

    const statusMap = { 'Paid': 'paid', 'Sent': 'sent', 'Draft': 'draft', 'Overdue': 'overdue', 'Partially Paid': 'partially_paid' };

    const { data: invoice, error } = await supabase
      .from('invoices')
      .insert({
        company_id: companyId,
        customer_id: customerId,
        job_id: jobId,
        invoice_type: 'standard',
        invoice_date: inv.invDate || null,
        due_date: inv.dueDate || null,
        description_of_work: inv.description || null,
        subtotal: inv.invAmount || 0,
        discount: 0,
        tax_amount: 0,
        total: inv.invAmount || 0,
        amount_paid: inv.amountPaid || 0,
        status: statusMap[inv.status] || 'sent',
        notes: [inv.notes, `Legacy invoice #: ${inv.invNum}`].filter(Boolean).join(' | '),
      })
      .select('id')
      .single();
    if (error) throw error;
    invoiceCount++;

    // one line item carrying the full description/amount, since the old sheet
    // doesn't break invoices into itemized lines
    await supabase.from('invoice_line_items').insert({
      invoice_id: invoice.id,
      description: inv.description || 'Services rendered',
      quantity: 1,
      unit_price: inv.invAmount || 0,
      line_total: inv.invAmount || 0,
      sort_order: 1,
    });

    if (inv.status === 'Paid' && inv.amountPaid > 0) {
      await supabase.from('payments').insert({
        invoice_id: invoice.id,
        payment_date: inv.paymentDate || inv.invDate || null,
        amount: inv.amountPaid,
        payment_method: 'other', // old sheet notes payment method in free text (e.g. "via Zelle") — not a structured column
        notes: inv.notes || null,
      });
      paymentCount++;
    }
  }
  console.log(`Imported ${invoiceCount} invoices and ${paymentCount} matching payments.`);

  // ---- 5. Expenses (Transactions sheet) ----
  // Owner Contribution rows are paired with the Expense row they funded by
  // matching date + amount, then folded into that expense as is_owner_funded=true.
  const txnSheet = wb.getWorksheet('Transactions');
  const rawRows = [];
  txnSheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;
    const v = row.values;
    const [_, date, txnId, type, account, payee, description, job, invoiceNum, billNum, paymentMethod, amountIn, amountOut, netAmount, receiptLink, reconciled, notes] = v;
    if (!date) return;
    rawRows.push({ date, txnId, type, account, payee, description, job, paymentMethod, amountIn, amountOut, receiptLink, notes });
  });

  const expenseRows = rawRows.filter(r => r.type === 'Expense');
  const contributionRows = rawRows.filter(r => r.type === 'Owner Contribution');

  // The old sheet's payment-method column is free text (e.g. "Personal AMEX
  // ending 3006"), but expenses.payment_method is a fixed Postgres enum —
  // map to the closest valid value and keep the original detail in notes.
  function mapPaymentMethod(raw) {
    const s = (raw || '').toLowerCase();
    if (s.includes('zelle')) return 'zelle';
    if (s.includes('check')) return 'check';
    if (s.includes('cash')) return 'cash';
    if (s.includes('wire')) return 'wire';
    if (s.includes('ach') || s.includes('transfer')) return 'ach';
    if (s.includes('debit')) return 'debit_card';
    if (s.includes('credit') || s.includes('amex') || s.includes('visa') || s.includes('mastercard')) return 'credit_card';
    return 'other';
  }

  let expenseCount = 0, ownerFundedCount = 0, unmatchedContributions = 0;

  for (const exp of expenseRows) {
    // try to find a same-date, same-amount Owner Contribution row that funded this expense
    const match = contributionRows.find(
      c => c.date && exp.date && c.date.getTime() === exp.date.getTime() && Math.abs(c.amountIn - exp.amountOut) < 0.01
    );

    const jobId = jobIdByName[exp.job] || null;
    const rawPaymentMethod = match ? match.paymentMethod : exp.paymentMethod;

    const { error } = await supabase.from('expenses').insert({
      company_id: companyId,
      job_id: jobId,
      expense_date: exp.date,
      vendor: exp.payee || null,
      amount: exp.amountOut || 0,
      description: exp.description || null,
      payment_method: mapPaymentMethod(rawPaymentMethod),
      is_owner_funded: !!match,
      receipt_available: exp.receiptLink ? !exp.receiptLink.toLowerCase().includes('pending') : false,
      notes: [exp.notes, `Legacy TXN: ${exp.txnId}`, rawPaymentMethod ? `Payment detail: ${rawPaymentMethod}` : null, exp.receiptLink].filter(Boolean).join(' | '),
    });
    if (error) throw error;
    expenseCount++;
    if (match) ownerFundedCount++;
  }

  // flag any Owner Contribution rows that never found a matching expense —
  // these need manual review, don't silently drop them
  for (const c of contributionRows) {
    const matched = expenseRows.some(
      e => e.date && c.date && e.date.getTime() === c.date.getTime() && Math.abs(c.amountIn - e.amountOut) < 0.01
    );
    if (!matched) unmatchedContributions++;
  }

  console.log(`Imported ${expenseCount} expenses (${ownerFundedCount} flagged as owner-funded).`);
  if (unmatchedContributions > 0) {
    console.warn(`WARNING: ${unmatchedContributions} Owner Contribution row(s) had no matching Expense row by date+amount. Review these manually in the original workbook — they weren't imported.`);
  }

  console.log('\nImport complete. Recommended next step: spot-check a few records in Supabase against the original workbook before deleting or archiving the old file.');
}

main().catch((err) => {
  console.error('Import failed:', err);
  process.exit(1);
});
