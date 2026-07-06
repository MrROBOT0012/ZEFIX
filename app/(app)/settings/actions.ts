'use server'

import { revalidatePath } from 'next/cache'
import { after } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { triggerWorkbookSync } from '@/lib/excel'

export type SettingsState = { error?: string; success?: boolean } | null

export async function updateSettings(
  _prev: SettingsState,
  formData: FormData
): Promise<SettingsState> {
  const supabase = await createClient()

  const { data: company, error: fetchErr } = await supabase
    .from('companies')
    .select('id')
    .single()

  if (fetchErr || !company) return { error: 'Company record not found.' }

  const taxInput = parseFloat((formData.get('sales_tax_rate') as string) ?? '0')

  const { error } = await supabase
    .from('companies')
    .update({
      legal_name:                   (formData.get('legal_name') as string).trim(),
      dba_name:                     (formData.get('dba_name') as string).trim() || null,
      ein:                          (formData.get('ein') as string).trim() || null,
      address:                      (formData.get('address') as string).trim() || null,
      phone:                        (formData.get('phone') as string).trim() || null,
      email:                        (formData.get('email') as string).trim() || null,
      logo_url:                     (formData.get('logo_url') as string).trim() || null,
      sales_tax_rate:               isNaN(taxInput) ? 0 : taxInput / 100,
      default_payment_terms:        (formData.get('default_payment_terms') as string).trim() || null,
      default_payment_instructions: (formData.get('default_payment_instructions') as string).trim() || null,
      default_invoice_notes:        (formData.get('default_invoice_notes') as string).trim() || null,
      default_estimate_notes:       (formData.get('default_estimate_notes') as string).trim() || null,
      next_invoice_number:          parseInt(formData.get('next_invoice_number') as string, 10),
      next_estimate_number:         parseInt(formData.get('next_estimate_number') as string, 10),
      next_receipt_number:          parseInt(formData.get('next_receipt_number') as string, 10),
    })
    .eq('id', company.id)

  if (error) return { error: error.message }

  revalidatePath('/settings')
  revalidatePath('/', 'layout')
  after(() => triggerWorkbookSync(supabase, company.id))
  return { success: true }
}
