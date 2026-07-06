/**
 * One-time resume script: finishes the legacy import after the first run
 * (supabase/import-legacy-data.js) succeeded on customers/jobs/invoices but
 * failed partway through expenses (payment_method enum bug, now fixed) and
 * silently failed on all 3 payment inserts (sync_invoice_on_payment trigger
 * bug — see migrations/0004_fix_payment_status_trigger.sql).
 *
 * Does NOT touch customers/jobs/invoices — only re-attempts Payments and
 * Expenses, looked up by legacy markers already stored in the DB (job
 * names, "Legacy invoice #:" in invoice notes) rather than re-parsing from
 * scratch. Safe to re-run: skips any expense whose "Legacy TXN:" marker
 * already exists, and any invoice that already has a payment recorded.
 *
 * Usage:
 *   node --env-file=.env.local supabase/finish-legacy-import.js path/to/Zelaya_Co_Master_Bookkeeping.xlsx
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

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Usage: node --env-file=.env.local supabase/finish-legacy-import.js path/to/workbook.xlsx');
    process.exit(1);
  }

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);

  const { data: company } = await supabase
    .from('companies')
    .select('id')
    .eq('legal_name', COMPANY_LEGAL_NAME)
    .single();
  if (!company) throw new Error('Company row not found — run import-legacy-data.js first.');
  const companyId = company.id;

  const { data: jobs } = await supabase.from('jobs').select('id, job_name').eq('company_id', companyId);
  const jobIdByName = Object.fromEntries((jobs ?? []).map(j => [j.job_name, j.id]));

  const { data: invoices } = await supabase.from('invoices').select('id, notes, total').eq('company_id', companyId);
  const invoiceIdByLegacyNum = {};
  for (const inv of invoices ?? []) {
    const m = (inv.notes || '').match(/Legacy invoice #: (\S+)/);
    if (m) invoiceIdByLegacyNum[m[1]] = inv.id;
  }

  const { data: existingPayments } = await supabase.from('payments').select('invoice_id');
  const invoicesWithPayments = new Set((existingPayments ?? []).map(p => p.invoice_id));

  const { data: existingExpenses } = await supabase.from('expenses').select('notes').eq('company_id', companyId);
  const importedTxnIds = new Set(
    (existingExpenses ?? [])
      .map(e => (e.notes || '').match(/Legacy TXN: (\S+)/))
      .filter(Boolean)
      .map(m => m[1])
  );

  // ---- Payments (re-derive the same rows import-legacy-data.js computed) ----
  const invSheet = wb.getWorksheet('Invoices_AR');
  const invoiceRows = [];
  invSheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;
    const v = row.values;
    const [, invDate, invNum, , , , , invAmount, amountPaid, , status, paymentDate, notes] = v;
    if (!invNum) return;
    invoiceRows.push({ invDate, invNum, invAmount, amountPaid, status, paymentDate, notes });
  });

  let paymentCount = 0, paymentFailures = 0;
  for (const inv of invoiceRows) {
    const invoiceId = invoiceIdByLegacyNum[inv.invNum];
    if (!invoiceId || invoicesWithPayments.has(invoiceId)) continue;
    if (inv.status === 'Paid' && inv.amountPaid > 0) {
      const { error } = await supabase.from('payments').insert({
        invoice_id: invoiceId,
        payment_date: inv.paymentDate || inv.invDate || null,
        amount: inv.amountPaid,
        payment_method: 'other',
        notes: inv.notes || null,
      });
      if (error) {
        console.error(`Payment for invoice ${inv.invNum} failed:`, error.message);
        paymentFailures++;
      } else {
        paymentCount++;
      }
    }
  }
  console.log(`Inserted ${paymentCount} payments (${paymentFailures} failed).`);
  if (paymentFailures > 0) {
    console.warn('Payment failures usually mean migrations/0004_fix_payment_status_trigger.sql hasn\'t been applied yet — apply it in the Supabase SQL Editor and re-run this script.');
  }

  // ---- Expenses (Transactions sheet) ----
  const txnSheet = wb.getWorksheet('Transactions');
  const rawRows = [];
  txnSheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;
    const v = row.values;
    const [, date, txnId, type, , payee, description, job, , , paymentMethod, amountIn, amountOut, , receiptLink] = v;
    if (!date) return;
    rawRows.push({ date, txnId, type, payee, description, job, paymentMethod, amountIn, amountOut, receiptLink });
  });

  const expenseRows = rawRows.filter(r => r.type === 'Expense');
  const contributionRows = rawRows.filter(r => r.type === 'Owner Contribution');

  let expenseCount = 0, ownerFundedCount = 0, skippedCount = 0;

  for (const exp of expenseRows) {
    if (importedTxnIds.has(String(exp.txnId))) {
      skippedCount++;
      continue;
    }

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
      notes: [exp.description, `Legacy TXN: ${exp.txnId}`, rawPaymentMethod ? `Payment detail: ${rawPaymentMethod}` : null, exp.receiptLink].filter(Boolean).join(' | '),
    });
    if (error) throw error;
    expenseCount++;
    if (match) ownerFundedCount++;
  }

  console.log(`Inserted ${expenseCount} expenses (${ownerFundedCount} owner-funded), skipped ${skippedCount} already imported.`);
  console.log('\nDone. Spot-check the new rows in the app before archiving the old spreadsheet.');
}

main().catch((err) => {
  console.error('Resume import failed:', err);
  process.exit(1);
});
