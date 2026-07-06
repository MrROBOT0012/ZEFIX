'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { after } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCompanyId } from '@/lib/company'
import { triggerWorkbookSync } from '@/lib/excel'

export type CustomerActionState = {
  error?: string
  fieldErrors?: Partial<Record<string, string>>
} | null

function extractCustomerFields(formData: FormData) {
  return {
    name:            (formData.get('name') as string).trim(),
    company_name:    (formData.get('company_name') as string).trim() || null,
    contact_person:  (formData.get('contact_person') as string).trim() || null,
    billing_address: (formData.get('billing_address') as string).trim() || null,
    job_location:    (formData.get('job_location') as string).trim() || null,
    phone:           (formData.get('phone') as string).trim() || null,
    email:           (formData.get('email') as string).trim() || null,
    notes:           (formData.get('notes') as string).trim() || null,
  }
}

export async function createCustomer(
  _prev: CustomerActionState,
  formData: FormData
): Promise<CustomerActionState> {
  const fields = extractCustomerFields(formData)
  if (!fields.name) return { fieldErrors: { name: 'Name is required.' } }

  const supabase = await createClient()
  const companyId = await getCompanyId()

  const { data, error } = await supabase
    .from('customers')
    .insert({ ...fields, company_id: companyId })
    .select('id')
    .single()

  if (error) return { error: error.message }
  after(() => triggerWorkbookSync(supabase, companyId))
  redirect(`/customers/${data.id}`)
}

export async function updateCustomer(
  customerId: string,
  _prev: CustomerActionState,
  formData: FormData
): Promise<CustomerActionState> {
  const fields = extractCustomerFields(formData)
  if (!fields.name) return { fieldErrors: { name: 'Name is required.' } }

  const supabase = await createClient()
  const companyId = await getCompanyId()

  const { error } = await supabase
    .from('customers')
    .update(fields)
    .eq('id', customerId)

  if (error) return { error: error.message }

  revalidatePath(`/customers/${customerId}`)
  revalidatePath('/customers')
  after(() => triggerWorkbookSync(supabase, companyId))
  redirect(`/customers/${customerId}`)
}

export async function deleteCustomer(customerId: string): Promise<void> {
  const supabase = await createClient()
  const companyId = await getCompanyId()
  await supabase.from('customers').delete().eq('id', customerId)
  revalidatePath('/customers')
  after(() => triggerWorkbookSync(supabase, companyId))
  redirect('/customers')
}
