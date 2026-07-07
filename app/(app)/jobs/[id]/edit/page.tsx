import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCompanyId } from '@/lib/company'
import { updateJob } from '../../actions'
import JobForm from '../../JobForm'

export default async function EditJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const companyId = await getCompanyId()

  const [{ data: job }, { data: customers }] = await Promise.all([
    supabase.from('jobs').select('*').eq('id', id).single(),
    supabase.from('customers').select('id, name, company_name').eq('company_id', companyId).order('name'),
  ])

  if (!job) notFound()

  const updateWithId = updateJob.bind(null, id)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Edit Job</h1>
        <p className="mt-1 text-sm text-gray-500">{job.job_name}</p>
      </div>
      <JobForm action={updateWithId} job={job} customers={customers ?? []} submitLabel="Save changes" />
    </div>
  )
}
