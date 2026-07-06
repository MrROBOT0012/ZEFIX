'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { after } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCompanyId, getCompany } from '@/lib/company'
import { parseLineItems, computeTotals, round2, type LineItemInput } from '@/lib/documentTotals'
import { triggerWorkbookSync } from '@/lib/excel'
import type { EstimateStatus } from '@/types/database'

export type EstimateActionState = {
  error?: string
  fieldErrors?: Partial<Record<string, string>>
} | null

function extractEstimateFields(formData: FormData) {
  const customer_id = (formData.get('customer_id') as string) || ''
  const job_id = (formData.get('job_id') as string) || ''
  const discount = Number(formData.get('discount')) || 0
  const taxPct = Number(formData.get('tax_rate')) || 0
  const tax_rate = taxPct / 100
  const lineItems = parseLineItems((formData.get('line_items') as string) || '[]')

  return {
    customer_id: customer_id || null,
    job_id: job_id || null,
    estimate_date: (formData.get('estimate_date') as string) || new Date().toISOString().slice(0, 10),
    expiration_date: (formData.get('expiration_date') as string) || null,
    job_location: (formData.get('job_location') as string)?.trim() || null,
    job_name: (formData.get('job_name') as string)?.trim() || null,
    equipment_info: (formData.get('equipment_info') as string)?.trim() || null,
    description_of_work: (formData.get('description_of_work') as string)?.trim() || null,
    notes: (formData.get('notes') as string)?.trim() || null,
    terms: (formData.get('terms') as string)?.trim() || null,
    discount,
    tax_rate,
    lineItems,
  }
}

async function replaceLineItems(
  supabase: Awaited<ReturnType<typeof createClient>>,
  estimateId: string,
  lineItems: LineItemInput[]
) {
  await supabase.from('estimate_line_items').delete().eq('estimate_id', estimateId)
  if (lineItems.length === 0) return

  const rows = lineItems.map((li, i) => ({
    estimate_id: estimateId,
    description: li.description,
    quantity: li.quantity,
    unit_price: li.unit_price,
    line_total: round2(li.quantity * li.unit_price),
    sort_order: i,
  }))
  await supabase.from('estimate_line_items').insert(rows)
}

export async function createEstimate(
  _prev: EstimateActionState,
  formData: FormData
): Promise<EstimateActionState> {
  const fields = extractEstimateFields(formData)

  if (!fields.customer_id) return { fieldErrors: { customer_id: 'Select a customer.' } }
  if (fields.lineItems.length === 0) {
    return { fieldErrors: { line_items: 'Add at least one line item.' } }
  }

  const supabase = await createClient()
  const companyId = await getCompanyId()
  const { subtotal, tax_amount, total } = computeTotals(fields.lineItems, fields.discount, fields.tax_rate)

  const { lineItems, ...estimateFields } = fields

  const { data, error } = await supabase
    .from('estimates')
    .insert({
      ...estimateFields,
      company_id: companyId,
      revision_number: 1,
      parent_estimate_id: null,
      converted_invoice_id: null,
      subtotal,
      tax_amount,
      total,
      status: 'draft',
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  await replaceLineItems(supabase, data.id, lineItems)

  after(() => triggerWorkbookSync(supabase, companyId))
  redirect(`/estimates/${data.id}`)
}

export async function updateEstimate(
  estimateId: string,
  _prev: EstimateActionState,
  formData: FormData
): Promise<EstimateActionState> {
  const fields = extractEstimateFields(formData)

  if (!fields.customer_id) return { fieldErrors: { customer_id: 'Select a customer.' } }
  if (fields.lineItems.length === 0) {
    return { fieldErrors: { line_items: 'Add at least one line item.' } }
  }

  const supabase = await createClient()
  const companyId = await getCompanyId()
  const { subtotal, tax_amount, total } = computeTotals(fields.lineItems, fields.discount, fields.tax_rate)
  const { lineItems, ...estimateFields } = fields

  const { error } = await supabase
    .from('estimates')
    .update({ ...estimateFields, subtotal, tax_amount, total })
    .eq('id', estimateId)

  if (error) return { error: error.message }

  await replaceLineItems(supabase, estimateId, lineItems)

  revalidatePath(`/estimates/${estimateId}`)
  revalidatePath('/estimates')
  after(() => triggerWorkbookSync(supabase, companyId))
  redirect(`/estimates/${estimateId}`)
}

export async function deleteEstimate(estimateId: string): Promise<void> {
  const supabase = await createClient()
  const companyId = await getCompanyId()

  const { data: estimate } = await supabase
    .from('estimates')
    .select('status')
    .eq('id', estimateId)
    .single()

  if (estimate?.status === 'converted') {
    // Converted estimates are linked to a real invoice — leave them in place.
    redirect(`/estimates/${estimateId}`)
  }

  await supabase.from('estimates').delete().eq('id', estimateId)
  revalidatePath('/estimates')
  after(() => triggerWorkbookSync(supabase, companyId))
  redirect('/estimates')
}

export async function updateEstimateStatus(
  estimateId: string,
  status: EstimateStatus
): Promise<void> {
  const supabase = await createClient()
  const companyId = await getCompanyId()
  await supabase.from('estimates').update({ status }).eq('id', estimateId)
  revalidatePath(`/estimates/${estimateId}`)
  revalidatePath('/estimates')
  after(() => triggerWorkbookSync(supabase, companyId))
  redirect(`/estimates/${estimateId}`)
}

export async function createEstimateRevision(estimateId: string): Promise<void> {
  const supabase = await createClient()
  const companyId = await getCompanyId()

  const { data: source } = await supabase
    .from('estimates')
    .select('*')
    .eq('id', estimateId)
    .single()

  if (!source) redirect('/estimates')

  const { data: sourceLineItems } = await supabase
    .from('estimate_line_items')
    .select('*')
    .eq('estimate_id', estimateId)
    .order('sort_order')

  const { data: revision, error } = await supabase
    .from('estimates')
    .insert({
      company_id: companyId,
      customer_id: source.customer_id,
      job_id: source.job_id,
      revision_number: source.revision_number + 1,
      parent_estimate_id: source.id,
      converted_invoice_id: null,
      estimate_date: new Date().toISOString().slice(0, 10),
      expiration_date: source.expiration_date,
      job_location: source.job_location,
      job_name: source.job_name,
      equipment_info: source.equipment_info,
      description_of_work: source.description_of_work,
      subtotal: source.subtotal,
      discount: source.discount,
      tax_rate: source.tax_rate,
      tax_amount: source.tax_amount,
      total: source.total,
      notes: source.notes,
      terms: source.terms,
      status: 'draft',
    })
    .select('id')
    .single()

  if (error || !revision) redirect(`/estimates/${estimateId}`)

  if (sourceLineItems && sourceLineItems.length > 0) {
    await supabase.from('estimate_line_items').insert(
      sourceLineItems.map((li) => ({
        estimate_id: revision.id,
        description: li.description,
        quantity: li.quantity,
        unit_price: li.unit_price,
        line_total: li.line_total,
        sort_order: li.sort_order,
      }))
    )
  }

  revalidatePath('/estimates')
  after(() => triggerWorkbookSync(supabase, companyId))
  redirect(`/estimates/${revision.id}/edit`)
}

// Builds a real invoice row from an approved estimate (invoices schema has
// been ready since 0001_initial_schema.sql).
export async function convertEstimateToInvoice(estimateId: string): Promise<void> {
  const supabase = await createClient()
  const companyId = await getCompanyId()
  const company = await getCompany()

  const { data: estimate } = await supabase
    .from('estimates')
    .select('*')
    .eq('id', estimateId)
    .single()

  if (!estimate || estimate.status !== 'approved') redirect(`/estimates/${estimateId}`)

  const [{ data: estimateLineItems }, { data: customer }] = await Promise.all([
    supabase.from('estimate_line_items').select('*').eq('estimate_id', estimateId).order('sort_order'),
    estimate.customer_id
      ? supabase.from('customers').select('billing_address').eq('id', estimate.customer_id).single()
      : Promise.resolve({ data: null }),
  ])

  const { data: invoice, error } = await supabase
    .from('invoices')
    .insert({
      company_id: companyId,
      customer_id: estimate.customer_id,
      job_id: estimate.job_id,
      invoice_type: 'standard',
      linked_final_invoice_id: null,
      invoice_date: new Date().toISOString().slice(0, 10),
      due_date: null,
      billing_address: customer?.billing_address ?? null,
      job_location: estimate.job_location,
      job_name: estimate.job_name,
      equipment_info: estimate.equipment_info,
      po_number: null,
      description_of_work: estimate.description_of_work,
      subtotal: estimate.subtotal,
      discount: estimate.discount,
      tax_rate: estimate.tax_rate,
      tax_amount: estimate.tax_amount,
      total: estimate.total,
      payment_terms: company.default_payment_terms,
      payment_instructions: company.default_payment_instructions,
      notes: estimate.notes,
      status: 'draft',
      source_estimate_id: estimate.id,
    })
    .select('id')
    .single()

  if (error || !invoice) redirect(`/estimates/${estimateId}`)

  if (estimateLineItems && estimateLineItems.length > 0) {
    await supabase.from('invoice_line_items').insert(
      estimateLineItems.map((li) => ({
        invoice_id: invoice.id,
        description: li.description,
        quantity: li.quantity,
        unit_price: li.unit_price,
        line_total: li.line_total,
        sort_order: li.sort_order,
      }))
    )
  }

  await supabase
    .from('estimates')
    .update({ status: 'converted', converted_invoice_id: invoice.id })
    .eq('id', estimateId)

  revalidatePath(`/estimates/${estimateId}`)
  revalidatePath('/invoices')
  after(() => triggerWorkbookSync(supabase, companyId))
  redirect(`/invoices/${invoice.id}`)
}
