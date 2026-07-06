import ExcelJS from 'exceljs'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { displayStatus } from '@/app/(app)/invoices/statusStyles'
import { getMonthlyRollup, getAccountsReceivable, getInvoiceStatusCounts } from '@/lib/bookkeeping'

type Supabase = SupabaseClient<Database>
type CellValue = string | number | boolean | Date | null

interface ColumnDef {
  key: string
  header: string
  width?: number
  numFmt?: string
}

interface SheetDef {
  name: string
  columns: ColumnDef[]
}

const CURRENCY_FMT = '$#,##0.00'
const DATE_FMT = 'm/d/yyyy'

// First column of every sheet is the hidden UUID/key helper column used to
// match existing rows on sync — never shown to the user, never edited by hand.
const SHEETS: SheetDef[] = [
  {
    name: 'Customers',
    columns: [
      { key: 'id', header: 'id' },
      { key: 'name', header: 'Name', width: 22 },
      { key: 'company_name', header: 'Company', width: 22 },
      { key: 'contact_person', header: 'Contact', width: 18 },
      { key: 'billing_address', header: 'Billing Address', width: 28 },
      { key: 'job_location', header: 'Job Location', width: 28 },
      { key: 'phone', header: 'Phone', width: 14 },
      { key: 'email', header: 'Email', width: 22 },
      { key: 'notes', header: 'Notes', width: 30 },
    ],
  },
  {
    name: 'Estimates',
    columns: [
      { key: 'id', header: 'id' },
      { key: 'estimate_number', header: 'Estimate #', width: 12 },
      { key: 'customer', header: 'Customer', width: 22 },
      { key: 'date', header: 'Date', width: 12, numFmt: DATE_FMT },
      { key: 'expiration', header: 'Expiration', width: 12, numFmt: DATE_FMT },
      { key: 'job', header: 'Job', width: 20 },
      { key: 'subtotal', header: 'Subtotal', width: 12, numFmt: CURRENCY_FMT },
      { key: 'discount', header: 'Discount', width: 12, numFmt: CURRENCY_FMT },
      { key: 'tax', header: 'Tax', width: 12, numFmt: CURRENCY_FMT },
      { key: 'total', header: 'Total', width: 12, numFmt: CURRENCY_FMT },
      { key: 'status', header: 'Status', width: 14 },
    ],
  },
  {
    name: 'Estimate Line Items',
    columns: [
      { key: 'id', header: 'id' },
      { key: 'estimate_id', header: 'Estimate ID', width: 22 },
      { key: 'description', header: 'Description', width: 32 },
      { key: 'quantity', header: 'Qty', width: 10 },
      { key: 'unit_price', header: 'Unit Price', width: 12, numFmt: CURRENCY_FMT },
      { key: 'line_total', header: 'Line Total', width: 12, numFmt: CURRENCY_FMT },
    ],
  },
  {
    name: 'Invoices',
    columns: [
      { key: 'id', header: 'id' },
      { key: 'invoice_number', header: 'Invoice #', width: 12 },
      { key: 'customer', header: 'Customer', width: 22 },
      { key: 'date', header: 'Date', width: 12, numFmt: DATE_FMT },
      { key: 'due_date', header: 'Due Date', width: 12, numFmt: DATE_FMT },
      { key: 'po_number', header: 'PO#', width: 12 },
      { key: 'subtotal', header: 'Subtotal', width: 12, numFmt: CURRENCY_FMT },
      { key: 'discount', header: 'Discount', width: 12, numFmt: CURRENCY_FMT },
      { key: 'tax', header: 'Tax', width: 12, numFmt: CURRENCY_FMT },
      { key: 'total', header: 'Total', width: 12, numFmt: CURRENCY_FMT },
      { key: 'amount_paid', header: 'Amount Paid', width: 14, numFmt: CURRENCY_FMT },
      { key: 'balance_due', header: 'Balance Due', width: 14, numFmt: CURRENCY_FMT },
      { key: 'status', header: 'Status', width: 14 },
    ],
  },
  {
    name: 'Invoice Line Items',
    columns: [
      { key: 'id', header: 'id' },
      { key: 'invoice_id', header: 'Invoice ID', width: 22 },
      { key: 'description', header: 'Description', width: 32 },
      { key: 'quantity', header: 'Qty', width: 10 },
      { key: 'unit_price', header: 'Unit Price', width: 12, numFmt: CURRENCY_FMT },
      { key: 'line_total', header: 'Line Total', width: 12, numFmt: CURRENCY_FMT },
    ],
  },
  {
    name: 'Payments',
    columns: [
      { key: 'id', header: 'id' },
      { key: 'invoice_id', header: 'Invoice ID', width: 22 },
      { key: 'date', header: 'Date', width: 12, numFmt: DATE_FMT },
      { key: 'amount', header: 'Amount', width: 12, numFmt: CURRENCY_FMT },
      { key: 'method', header: 'Method', width: 14 },
      { key: 'reference', header: 'Reference', width: 16 },
      { key: 'notes', header: 'Notes', width: 28 },
    ],
  },
  {
    name: 'Receipts',
    columns: [
      { key: 'id', header: 'id' },
      { key: 'receipt_number', header: 'Receipt #', width: 12 },
      { key: 'invoice_id', header: 'Invoice ID', width: 22 },
      { key: 'customer', header: 'Customer', width: 22 },
      { key: 'date', header: 'Date', width: 12, numFmt: DATE_FMT },
      { key: 'amount', header: 'Amount', width: 12, numFmt: CURRENCY_FMT },
      { key: 'method', header: 'Method', width: 14 },
      { key: 'remaining_balance', header: 'Remaining Balance', width: 16, numFmt: CURRENCY_FMT },
    ],
  },
  {
    name: 'Expenses',
    columns: [
      { key: 'id', header: 'id' },
      { key: 'date', header: 'Date', width: 12, numFmt: DATE_FMT },
      { key: 'vendor', header: 'Vendor', width: 20 },
      { key: 'amount', header: 'Amount', width: 12, numFmt: CURRENCY_FMT },
      { key: 'category', header: 'Category', width: 20 },
      { key: 'payment_method', header: 'Payment Method', width: 14 },
      { key: 'related_customer', header: 'Related Customer', width: 20 },
      { key: 'related_invoice', header: 'Related Invoice', width: 14 },
      { key: 'notes', header: 'Notes', width: 28 },
    ],
  },
  {
    name: 'Bookkeeping Summary',
    columns: [
      { key: 'id', header: 'id' },
      { key: 'month', header: 'Month', width: 12 },
      { key: 'income', header: 'Income', width: 12, numFmt: CURRENCY_FMT },
      { key: 'expenses', header: 'Expenses', width: 12, numFmt: CURRENCY_FMT },
      { key: 'profit', header: 'Profit', width: 12, numFmt: CURRENCY_FMT },
      { key: 'ar_total', header: 'AR Total', width: 12, numFmt: CURRENCY_FMT },
      { key: 'paid_count', header: 'Paid', width: 10 },
      { key: 'unpaid_count', header: 'Unpaid', width: 10 },
      { key: 'overdue_count', header: 'Overdue', width: 10 },
    ],
  },
  {
    name: 'Settings',
    columns: [
      { key: 'id', header: 'id' },
      { key: 'legal_name', header: 'Legal Name', width: 22 },
      { key: 'dba_name', header: 'DBA Name', width: 22 },
      { key: 'address', header: 'Address', width: 28 },
      { key: 'phone', header: 'Phone', width: 14 },
      { key: 'email', header: 'Email', width: 22 },
      { key: 'ein', header: 'EIN', width: 14 },
      { key: 'sales_tax_rate', header: 'Sales Tax Rate (%)', width: 14 },
      { key: 'default_payment_terms', header: 'Default Payment Terms', width: 22 },
      { key: 'next_invoice_number', header: 'Next Invoice #', width: 14 },
      { key: 'next_estimate_number', header: 'Next Estimate #', width: 14 },
      { key: 'next_receipt_number', header: 'Next Receipt #', width: 14 },
    ],
  },
]

function parseISODate(date: string | null | undefined): Date | null {
  if (!date) return null
  const [y, m, d] = date.split('-').map(Number)
  return new Date(y, m - 1, d)
}

async function fetchAllSheetData(
  supabase: Supabase,
  companyId: string
): Promise<Record<string, Record<string, CellValue>[]>> {
  const [
    { data: customers },
    { data: estimates },
    { data: invoices },
    { data: payments },
    { data: receipts },
    { data: expenses },
    { data: categories },
    { data: company },
  ] = await Promise.all([
    supabase.from('customers').select('*').eq('company_id', companyId),
    supabase.from('estimates').select('*').eq('company_id', companyId),
    supabase.from('invoices').select('*').eq('company_id', companyId),
    supabase.from('payments').select('*'),
    supabase.from('receipts').select('*').eq('company_id', companyId),
    supabase.from('expenses').select('*').eq('company_id', companyId),
    supabase.from('expense_categories').select('*').eq('company_id', companyId),
    supabase.from('companies').select('*').eq('id', companyId).single(),
  ])

  const customerName = new Map((customers ?? []).map((c) => [c.id, c.name]))
  const categoryName = new Map((categories ?? []).map((c) => [c.id, c.name]))
  const invoiceNumber = new Map((invoices ?? []).map((i) => [i.id, i.invoice_number]))
  const invoiceIds = new Set((invoices ?? []).map((i) => i.id))

  const companyPayments = (payments ?? []).filter((p) => invoiceIds.has(p.invoice_id))

  const [estimateIds, invoiceLineIds] = [
    (estimates ?? []).map((e) => e.id),
    (invoices ?? []).map((i) => i.id),
  ]

  const [{ data: estimateLineItems }, { data: invoiceLineItems }] = await Promise.all([
    estimateIds.length
      ? supabase.from('estimate_line_items').select('*').in('estimate_id', estimateIds)
      : Promise.resolve({ data: [] }),
    invoiceLineIds.length
      ? supabase.from('invoice_line_items').select('*').in('invoice_id', invoiceLineIds)
      : Promise.resolve({ data: [] }),
  ])

  const [monthly, arTotal, statusCounts] = await Promise.all([
    getMonthlyRollup(supabase, companyId, 12),
    getAccountsReceivable(supabase, companyId),
    getInvoiceStatusCounts(supabase, companyId),
  ])

  const unpaidCount = statusCounts.sent + statusCounts.partially_paid + statusCounts.draft

  return {
    Customers: (customers ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      company_name: c.company_name,
      contact_person: c.contact_person,
      billing_address: c.billing_address,
      job_location: c.job_location,
      phone: c.phone,
      email: c.email,
      notes: c.notes,
    })),
    Estimates: (estimates ?? []).map((e) => ({
      id: e.id,
      estimate_number: e.estimate_number,
      customer: customerName.get(e.customer_id ?? '') ?? null,
      date: parseISODate(e.estimate_date),
      expiration: parseISODate(e.expiration_date),
      job: e.job_name,
      subtotal: e.subtotal,
      discount: e.discount,
      tax: e.tax_amount,
      total: e.total,
      status: e.status,
    })),
    'Estimate Line Items': (estimateLineItems ?? []).map((li) => ({
      id: li.id,
      estimate_id: li.estimate_id,
      description: li.description,
      quantity: li.quantity,
      unit_price: li.unit_price,
      line_total: li.line_total,
    })),
    Invoices: (invoices ?? []).map((i) => ({
      id: i.id,
      invoice_number: i.invoice_number,
      customer: customerName.get(i.customer_id ?? '') ?? null,
      date: parseISODate(i.invoice_date),
      due_date: parseISODate(i.due_date),
      po_number: i.po_number,
      subtotal: i.subtotal,
      discount: i.discount,
      tax: i.tax_amount,
      total: i.total,
      amount_paid: i.amount_paid,
      balance_due: i.balance_due,
      status: displayStatus(i.status, i.due_date),
    })),
    'Invoice Line Items': (invoiceLineItems ?? []).map((li) => ({
      id: li.id,
      invoice_id: li.invoice_id,
      description: li.description,
      quantity: li.quantity,
      unit_price: li.unit_price,
      line_total: li.line_total,
    })),
    Payments: companyPayments.map((p) => ({
      id: p.id,
      invoice_id: p.invoice_id,
      date: parseISODate(p.payment_date),
      amount: p.amount,
      method: p.payment_method,
      reference: p.reference_number,
      notes: p.notes,
    })),
    Receipts: (receipts ?? []).map((r) => ({
      id: r.id,
      receipt_number: r.receipt_number,
      invoice_id: r.invoice_id,
      customer: customerName.get(r.customer_id) ?? null,
      date: parseISODate(r.payment_date),
      amount: r.payment_amount,
      method: r.payment_method,
      remaining_balance: r.remaining_balance,
    })),
    Expenses: (expenses ?? []).map((e) => ({
      id: e.id,
      date: parseISODate(e.expense_date),
      vendor: e.vendor,
      amount: e.amount,
      category: categoryName.get(e.category_id ?? '') ?? null,
      payment_method: e.payment_method,
      related_customer: customerName.get(e.related_customer_id ?? '') ?? null,
      related_invoice: invoiceNumber.get(e.related_invoice_id ?? '') ?? null,
      notes: e.notes,
    })),
    'Bookkeeping Summary': monthly.map((m, i) => {
      const isCurrent = i === monthly.length - 1
      return {
        id: m.monthKey,
        month: m.monthLabel,
        income: m.income,
        expenses: m.expenses,
        profit: m.profit,
        ar_total: isCurrent ? arTotal : null,
        paid_count: isCurrent ? statusCounts.paid : null,
        unpaid_count: isCurrent ? unpaidCount : null,
        overdue_count: isCurrent ? statusCounts.overdue : null,
      }
    }),
    Settings: company
      ? [
          {
            id: company.id,
            legal_name: company.legal_name,
            dba_name: company.dba_name,
            address: company.address,
            phone: company.phone,
            email: company.email,
            ein: company.ein,
            sales_tax_rate: company.sales_tax_rate * 100,
            default_payment_terms: company.default_payment_terms,
            next_invoice_number: company.next_invoice_number,
            next_estimate_number: company.next_estimate_number,
            next_receipt_number: company.next_receipt_number,
          },
        ]
      : [],
  }
}

function ensureSheet(workbook: ExcelJS.Workbook, def: SheetDef): ExcelJS.Worksheet {
  let ws = workbook.getWorksheet(def.name)
  if (!ws) {
    ws = workbook.addWorksheet(def.name)
    const headerRow = ws.getRow(1)
    def.columns.forEach((col, i) => {
      headerRow.getCell(i + 1).value = col.header
      if (col.width) ws!.getColumn(i + 1).width = col.width
    })
    headerRow.font = { bold: true }
    ws.getColumn(1).hidden = true
  }
  return ws
}

function getHeaderMap(ws: ExcelJS.Worksheet): Map<string, number> {
  const map = new Map<string, number>()
  const headerRow = ws.getRow(1)
  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    if (typeof cell.value === 'string') map.set(cell.value, colNumber)
  })
  return map
}

function syncSheetRows(ws: ExcelJS.Worksheet, def: SheetDef, rows: Record<string, CellValue>[]) {
  const headerMap = getHeaderMap(ws)

  // Append any columns this sheet definition expects but the existing file
  // doesn't have yet (e.g. the sheet pre-dates a column being added).
  let nextCol = ws.columnCount + 1
  for (const col of def.columns) {
    if (!headerMap.has(col.header)) {
      ws.getRow(1).getCell(nextCol).value = col.header
      if (col.width) ws.getColumn(nextCol).width = col.width
      headerMap.set(col.header, nextCol)
      nextCol++
    }
  }

  const idColIndex = headerMap.get(def.columns[0].header)!

  const idToRowNumber = new Map<string, number>()
  for (let r = 2; r <= ws.rowCount; r++) {
    const idVal = ws.getRow(r).getCell(idColIndex).value
    if (idVal !== null && idVal !== undefined && idVal !== '') {
      idToRowNumber.set(String(idVal), r)
    }
  }

  let appendAt = ws.rowCount + 1

  for (const row of rows) {
    const id = String(row[def.columns[0].key])
    const existingRowNumber = idToRowNumber.get(id)
    const isNewRow = existingRowNumber === undefined
    const rowNumber = existingRowNumber ?? appendAt++
    const excelRow = ws.getRow(rowNumber)

    for (const col of def.columns) {
      const colIndex = headerMap.get(col.header)!
      const cell = excelRow.getCell(colIndex)
      cell.value = (row[col.key] ?? null) as ExcelJS.CellValue
      if (isNewRow && col.numFmt) cell.numFmt = col.numFmt
    }
  }
}

export async function syncWorkbook(supabase: Supabase, companyId: string): Promise<void> {
  const path = `${companyId}/workbook.xlsx`

  const workbook = new ExcelJS.Workbook()

  const { data: existingBlob } = await supabase.storage.from('workbooks').download(path)

  if (existingBlob) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    await supabase.storage
      .from('workbooks')
      .upload(`${companyId}/backups/${timestamp}.xlsx`, existingBlob, {
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })

    // exceljs's bundled types predate Node's generic Buffer<ArrayBufferLike> — same
    // object at runtime, just a structural mismatch against the newer @types/node.
    const buffer = Buffer.from(await existingBlob.arrayBuffer())
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await workbook.xlsx.load(buffer as any)
  }

  const dataBySheet = await fetchAllSheetData(supabase, companyId)

  for (const def of SHEETS) {
    const ws = ensureSheet(workbook, def)
    syncSheetRows(ws, def, dataBySheet[def.name] ?? [])
  }

  const outBuffer = await workbook.xlsx.writeBuffer()

  const { error } = await supabase.storage.from('workbooks').upload(path, outBuffer, {
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    upsert: true,
  })

  if (error) throw new Error(error.message)
}

export async function triggerWorkbookSync(supabase: Supabase, companyId: string): Promise<void> {
  try {
    await syncWorkbook(supabase, companyId)
  } catch (err) {
    console.error('[excel] workbook sync failed:', err)
  }
}
