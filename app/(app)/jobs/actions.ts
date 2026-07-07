'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { after } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCompanyId } from '@/lib/company'
import { triggerWorkbookSync } from '@/lib/excel'
import type { JobStatus } from '@/types/database'

export type JobActionState = {
  error?: string
  fieldErrors?: Partial<Record<string, string>>
} | null

function extractJobFields(formData: FormData) {
  const customer_id = (formData.get('customer_id') as string) || ''
  const quotedRaw = (formData.get('quoted_amount') as string) || ''

  return {
    job_name: (formData.get('job_name') as string).trim(),
    customer_id: customer_id || null,
    location: (formData.get('location') as string).trim() || null,
    start_date: (formData.get('start_date') as string) || null,
    status: (formData.get('status') as string || 'active') as JobStatus,
    quoted_amount: quotedRaw ? Number(quotedRaw) : null,
    notes: (formData.get('notes') as string).trim() || null,
  }
}

export async function createJob(
  _prev: JobActionState,
  formData: FormData
): Promise<JobActionState> {
  const fields = extractJobFields(formData)
  if (!fields.job_name) return { fieldErrors: { job_name: 'Job name is required.' } }

  const supabase = await createClient()
  const companyId = await getCompanyId()

  const { data, error } = await supabase
    .from('jobs')
    .insert({ ...fields, company_id: companyId })
    .select('id')
    .single()

  if (error) return { error: error.message }
  after(() => triggerWorkbookSync(supabase, companyId))
  redirect(`/jobs/${data.id}`)
}

export async function updateJob(
  jobId: string,
  _prev: JobActionState,
  formData: FormData
): Promise<JobActionState> {
  const fields = extractJobFields(formData)
  if (!fields.job_name) return { fieldErrors: { job_name: 'Job name is required.' } }

  const supabase = await createClient()
  const companyId = await getCompanyId()

  const { error } = await supabase
    .from('jobs')
    .update(fields)
    .eq('id', jobId)

  if (error) return { error: error.message }

  revalidatePath(`/jobs/${jobId}`)
  revalidatePath('/jobs')
  after(() => triggerWorkbookSync(supabase, companyId))
  redirect(`/jobs/${jobId}`)
}

export async function deleteJob(jobId: string): Promise<void> {
  const supabase = await createClient()
  const companyId = await getCompanyId()
  await supabase.from('jobs').delete().eq('id', jobId)
  revalidatePath('/jobs')
  after(() => triggerWorkbookSync(supabase, companyId))
  redirect('/jobs')
}
