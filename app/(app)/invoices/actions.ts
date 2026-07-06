'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { after } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCompanyId } from '@/lib/company'
import { parseLineItems, computeTotals, round2, type LineItemInput } from '@/lib/documentTotals'
import { triggerWorkbookSync } from '@/lib/excel'
import { logAudit, diffFields } from '@/lib/audit'
import type { InvoiceStatus, InvoiceType } from '@/types/database'

export type InvoiceActionState = {
  error?: string
  fieldErrors?: Partial<Record<string, string>>
} | null

function extractInvoiceFields(formData: FormData) {
  const customer_id = (formData.get('customer_id') as string) || ''
  const job_id = (formData.get('job_id') as string) || ''
  const discount = Number(formData.get('discount')) || 0
  const taxPct = Number(formData.get('tax_rate')) || 0
  const tax_rate = taxPct / 100
  const lineItems = parseLineItems((formData.get('line_items') as string) || '[]')

  return {
    customer_id: customer_id || null,
    job_id: job_id || null,
    invoice_type: ((formData.get('invoice_type') as string) || 'standard') as InvoiceType,
    invoice_date: (formData.get('invoice_date') as string) || new Date().toISOString().slice(0, 10),
    due_date: (formData.get('due_date') as string) || null,
    billing_address: (formData.get('billing_address') as string)?.trim() || null,
    job_location: (formData.get('job_location') as string)?.trim() || null,
    job_name: (formData.get('job_name') as string)?.trim() || null,
    equipment_info: (formData.get('equipment_info') as string)?.trim() || null,
    po_number: (formData.get('po_number') as string)?.trim() || null,
    description_of_work: (formData.get('description_of_work') as string)?.trim() || null,
    payment_terms: (formData.get('payment_terms') as string)?.trim() || null,
    payment_instructions: (formData.get('payment_instructions') as string)?.trim() || null,
    notes: (formData.get('notes') as string)?.trim() || null,
    discount,
    tax_rate,
    lineItems,
  }
}

async function replaceLineItems(
  supabase: Awaited<ReturnType<typeof createClient>>,
  invoiceId: string,
  lineItems: LineItemInput[]
) {
  await supabase.from('invoice_line_items').delete().eq('invoice_id', invoiceId)
  if (lineItems.length === 0) return

  const rows = lineItems.map((li, i) => ({
    invoice_id: invoiceId,
    description: li.description,
    quantity: li.quantity,
    unit_price: li.unit_price,
    line_total: round2(li.quantity * li.unit_price),
    sort_order: i,
  }))
  await supabase.from('invoice_line_items').insert(rows)
}

export async function createInvoice(
  _prev: InvoiceActionState,
  formData: FormData
): Promise<InvoiceActionState> {
  const fields = extractInvoiceFields(formData)

  if (!fields.customer_id) return { fieldErrors: { customer_id: 'Select a customer.' } }
  if (fields.lineItems.length === 0) {
    return { fieldErrors: { line_items: 'Add at least one line item.' } }
  }

  const supabase = await createClient()
  const companyId = await getCompanyId()
  const { subtotal, tax_amount, total } = computeTotals(fields.lineItems, fields.discount, fields.tax_rate)

  const { lineItems, ...invoiceFields } = fields

  const { data, error } = await supabase
    .from('invoices')
    .insert({
      ...invoiceFields,
      company_id: companyId,
      linked_final_invoice_id: null,
      source_estimate_id: null,
      subtotal,
      tax_amount,
      total,
      status: 'draft',
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  await replaceLineItems(supabase, data.id, lineItems)
  await logAudit(supabase, 'invoice', data.id, 'created', { ...invoiceFields, subtotal, tax_amount, total })

  after(() => triggerWorkbookSync(supabase, companyId))
  redirect(`/invoices/${data.id}`)
}

export async function updateInvoice(
  invoiceId: string,
  _prev: InvoiceActionState,
  formData: FormData
): Promise<InvoiceActionState> {
  const fields = extractInvoiceFields(formData)

  if (!fields.customer_id) return { fieldErrors: { customer_id: 'Select a customer.' } }
  if (fields.lineItems.length === 0) {
    return { fieldErrors: { line_items: 'Add at least one line item.' } }
  }

  const supabase = await createClient()
  const companyId = await getCompanyId()
  const { subtotal, tax_amount, total } = computeTotals(fields.lineItems, fields.discount, fields.tax_rate)
  const { lineItems, ...invoiceFields } = fields

  const { data: existing } = await supabase.from('invoices').select('*').eq('id', invoiceId).single()

  const { error } = await supabase
    .from('invoices')
    .update({ ...invoiceFields, subtotal, tax_amount, total })
    .eq('id', invoiceId)

  if (error) return { error: error.message }

  await replaceLineItems(supabase, invoiceId, lineItems)
  if (existing) {
    const diff = diffFields(existing, { ...invoiceFields, subtotal, tax_amount, total })
    if (diff) await logAudit(supabase, 'invoice', invoiceId, 'updated', diff)
  }

  revalidatePath(`/invoices/${invoiceId}`)
  revalidatePath('/invoices')
  after(() => triggerWorkbookSync(supabase, companyId))
  redirect(`/invoices/${invoiceId}`)
}

export async function deleteInvoice(invoiceId: string): Promise<void> {
  const supabase = await createClient()
  const companyId = await getCompanyId()

  const { data: invoice } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', invoiceId)
    .single()

  if (invoice && invoice.amount_paid > 0) {
    // Has recorded payments — leave it in place rather than losing that history.
    redirect(`/invoices/${invoiceId}`)
  }

  await supabase.from('invoices').delete().eq('id', invoiceId)
  if (invoice) await logAudit(supabase, 'invoice', invoiceId, 'deleted', invoice)
  revalidatePath('/invoices')
  after(() => triggerWorkbookSync(supabase, companyId))
  redirect('/invoices')
}

export async function updateInvoiceStatus(
  invoiceId: string,
  status: InvoiceStatus
): Promise<void> {
  const supabase = await createClient()
  const companyId = await getCompanyId()

  const { data: existing } = await supabase.from('invoices').select('status').eq('id', invoiceId).single()

  await supabase.from('invoices').update({ status }).eq('id', invoiceId)

  if (existing && existing.status !== status) {
    await logAudit(supabase, 'invoice', invoiceId, status === 'cancelled' ? 'voided' : 'updated', {
      status: { before: existing.status, after: status },
    })
  }

  revalidatePath(`/invoices/${invoiceId}`)
  revalidatePath('/invoices')
  after(() => triggerWorkbookSync(supabase, companyId))
  redirect(`/invoices/${invoiceId}`)
}
