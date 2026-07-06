'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { after } from 'next/server'
import { randomUUID } from 'node:crypto'
import { createClient } from '@/lib/supabase/server'
import { getCompanyId } from '@/lib/company'
import { triggerWorkbookSync } from '@/lib/excel'
import { logAudit, diffFields } from '@/lib/audit'
import type { PaymentMethod } from '@/types/database'

export type ExpenseActionState = {
  error?: string
  fieldErrors?: Partial<Record<string, string>>
} | null

function extractExpenseFields(formData: FormData) {
  const category_id = (formData.get('category_id') as string) || ''
  const job_id = (formData.get('job_id') as string) || ''
  const related_customer_id = (formData.get('related_customer_id') as string) || ''
  const related_invoice_id = (formData.get('related_invoice_id') as string) || ''
  const payment_method = (formData.get('payment_method') as string) || ''

  return {
    expense_date: (formData.get('expense_date') as string) || new Date().toISOString().slice(0, 10),
    vendor: (formData.get('vendor') as string)?.trim() || null,
    amount: Number(formData.get('amount')) || 0,
    description: (formData.get('description') as string)?.trim() || null,
    category_id: category_id || null,
    payment_method: (payment_method || null) as PaymentMethod | null,
    is_owner_funded: formData.get('is_owner_funded') === 'on',
    related_customer_id: related_customer_id || null,
    related_invoice_id: related_invoice_id || null,
    job_id: job_id || null,
    notes: (formData.get('notes') as string)?.trim() || null,
  }
}

function sanitizeExt(ext: string): string {
  return ext.replace(/[^a-zA-Z0-9]+/g, '')
}

async function uploadReceipt(
  supabase: Awaited<ReturnType<typeof createClient>>,
  companyId: string,
  file: File
): Promise<string> {
  const rawExt = file.name.includes('.') ? file.name.split('.').pop() ?? '' : ''
  const ext = sanitizeExt(rawExt)
  const path = `${companyId}/${randomUUID()}${ext ? `.${ext}` : ''}`

  const { error } = await supabase.storage.from('receipts').upload(path, file, {
    contentType: file.type || undefined,
  })
  if (error) throw new Error(error.message)

  return path
}

export async function createExpense(
  _prev: ExpenseActionState,
  formData: FormData
): Promise<ExpenseActionState> {
  const fields = extractExpenseFields(formData)

  if (!fields.expense_date) return { fieldErrors: { expense_date: 'Enter a date.' } }
  if (fields.amount <= 0) return { fieldErrors: { amount: 'Enter an amount greater than zero.' } }

  const supabase = await createClient()
  const companyId = await getCompanyId()

  const file = formData.get('receipt_file') as File | null
  let receipt_attachment_url: string | null = null
  let receipt_available = formData.get('receipt_available') === 'on'

  if (file && file.size > 0) {
    try {
      receipt_attachment_url = await uploadReceipt(supabase, companyId, file)
      receipt_available = true
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Failed to upload receipt.' }
    }
  }

  const { data, error } = await supabase
    .from('expenses')
    .insert({
      ...fields,
      company_id: companyId,
      receipt_available,
      receipt_attachment_url,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  await logAudit(supabase, 'expense', data.id, 'created', { ...fields, receipt_available, receipt_attachment_url })

  revalidatePath('/expenses')
  after(() => triggerWorkbookSync(supabase, companyId))
  redirect(`/expenses/${data.id}`)
}

export async function updateExpense(
  expenseId: string,
  _prev: ExpenseActionState,
  formData: FormData
): Promise<ExpenseActionState> {
  const fields = extractExpenseFields(formData)

  if (!fields.expense_date) return { fieldErrors: { expense_date: 'Enter a date.' } }
  if (fields.amount <= 0) return { fieldErrors: { amount: 'Enter an amount greater than zero.' } }

  const supabase = await createClient()

  const { data: existing } = await supabase
    .from('expenses')
    .select('*')
    .eq('id', expenseId)
    .single()

  if (!existing) return { error: 'Expense not found.' }

  const file = formData.get('receipt_file') as File | null
  const removeReceipt = formData.get('remove_receipt') === 'on'
  let receipt_attachment_url = existing.receipt_attachment_url
  let receipt_available = formData.get('receipt_available') === 'on'

  if (file && file.size > 0) {
    try {
      const newPath = await uploadReceipt(supabase, existing.company_id, file)
      if (existing.receipt_attachment_url) {
        await supabase.storage.from('receipts').remove([existing.receipt_attachment_url])
      }
      receipt_attachment_url = newPath
      receipt_available = true
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Failed to upload receipt.' }
    }
  } else if (removeReceipt && existing.receipt_attachment_url) {
    await supabase.storage.from('receipts').remove([existing.receipt_attachment_url])
    receipt_attachment_url = null
  }

  const { error } = await supabase
    .from('expenses')
    .update({ ...fields, receipt_available, receipt_attachment_url })
    .eq('id', expenseId)

  if (error) return { error: error.message }

  const diff = diffFields(existing, { ...fields, receipt_available, receipt_attachment_url })
  if (diff) await logAudit(supabase, 'expense', expenseId, 'updated', diff)

  revalidatePath(`/expenses/${expenseId}`)
  revalidatePath('/expenses')
  after(() => triggerWorkbookSync(supabase, existing.company_id))
  redirect(`/expenses/${expenseId}`)
}

export async function deleteExpense(expenseId: string): Promise<void> {
  const supabase = await createClient()

  const { data: expense } = await supabase
    .from('expenses')
    .select('*')
    .eq('id', expenseId)
    .single()

  if (expense?.receipt_attachment_url) {
    await supabase.storage.from('receipts').remove([expense.receipt_attachment_url])
  }

  await supabase.from('expenses').delete().eq('id', expenseId)
  if (expense) {
    await logAudit(supabase, 'expense', expenseId, 'deleted', expense)
    after(() => triggerWorkbookSync(supabase, expense.company_id))
  }
  revalidatePath('/expenses')
  redirect('/expenses')
}
