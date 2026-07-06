'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { after } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { round2 } from '@/lib/documentTotals'
import { triggerWorkbookSync } from '@/lib/excel'
import { logAudit } from '@/lib/audit'
import type { PaymentMethod } from '@/types/database'

export type PaymentActionState = {
  error?: string
  fieldErrors?: Partial<Record<string, string>>
} | null

export async function createPayment(
  _prev: PaymentActionState,
  formData: FormData
): Promise<PaymentActionState> {
  const invoice_id = (formData.get('invoice_id') as string) || ''
  const payment_date = (formData.get('payment_date') as string) || new Date().toISOString().slice(0, 10)
  const amount = round2(Number(formData.get('amount')) || 0)
  const payment_method = ((formData.get('payment_method') as string) || 'other') as PaymentMethod
  const reference_number = (formData.get('reference_number') as string)?.trim() || null
  const notes = (formData.get('notes') as string)?.trim() || null

  if (!invoice_id) return { fieldErrors: { invoice_id: 'Select an invoice.' } }
  if (amount <= 0) return { fieldErrors: { amount: 'Enter an amount greater than zero.' } }

  const supabase = await createClient()

  const { data: invoice } = await supabase
    .from('invoices')
    .select('id, company_id, customer_id, total, status')
    .eq('id', invoice_id)
    .single()

  if (!invoice) return { error: 'Invoice not found.' }
  if (invoice.status === 'cancelled') return { error: 'Cannot record a payment against a cancelled invoice.' }
  if (!invoice.customer_id) return { error: 'Invoice has no customer on file — cannot generate a receipt.' }

  const { data: payment, error } = await supabase
    .from('payments')
    .insert({ invoice_id, payment_date, amount, payment_method, reference_number, notes })
    .select('id')
    .single()

  if (error) return { error: error.message }

  await logAudit(supabase, 'payment', payment.id, 'created', {
    invoice_id,
    payment_date,
    amount,
    payment_method,
    reference_number,
    notes,
  })

  // The payments trigger has already recalculated invoices.amount_paid — read it
  // back so the receipt's remaining_balance reflects this payment.
  const { data: updatedInvoice } = await supabase
    .from('invoices')
    .select('amount_paid')
    .eq('id', invoice_id)
    .single()

  const remaining_balance = round2(invoice.total - (updatedInvoice?.amount_paid ?? 0))

  const { data: receipt } = await supabase
    .from('receipts')
    .insert({
      company_id: invoice.company_id,
      payment_id: payment.id,
      invoice_id,
      customer_id: invoice.customer_id,
      payment_date,
      payment_amount: amount,
      payment_method,
      reference_number,
      remaining_balance,
      notes,
    })
    .select('id')
    .single()

  revalidatePath(`/invoices/${invoice_id}`)
  revalidatePath('/payments')
  revalidatePath('/receipts')

  after(() => triggerWorkbookSync(supabase, invoice.company_id))
  redirect(receipt ? `/receipts/${receipt.id}` : `/invoices/${invoice_id}`)
}

export async function deletePayment(paymentId: string): Promise<void> {
  const supabase = await createClient()

  const { data: payment } = await supabase
    .from('payments')
    .select('*')
    .eq('id', paymentId)
    .single()

  if (!payment) return

  const { data: invoice } = await supabase
    .from('invoices')
    .select('company_id')
    .eq('id', payment.invoice_id)
    .single()

  // receipts.payment_id is ON DELETE CASCADE, so the matching receipt goes with it.
  await supabase.from('payments').delete().eq('id', paymentId)
  await logAudit(supabase, 'payment', paymentId, 'deleted', payment)

  revalidatePath(`/invoices/${payment.invoice_id}`)
  revalidatePath('/payments')
  revalidatePath('/receipts')

  if (invoice) after(() => triggerWorkbookSync(supabase, invoice.company_id))
}
