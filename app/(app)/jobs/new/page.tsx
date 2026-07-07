import { createClient } from '@/lib/supabase/server'
import { getCompanyId } from '@/lib/company'
import { createJob } from '../actions'
import JobForm from '../JobForm'

export default async function NewJobPage({
  searchParams,
}: {
  searchParams: Promise<{ customer?: string }>
}) {
  const { customer } = await searchParams
  const supabase = await createClient()
  const companyId = await getCompanyId()

  const { data: customers } = await supabase
    .from('customers')
    .select('id, name, company_name')
    .eq('company_id', companyId)
    .order('name')

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">New Job</h1>
      </div>
      <JobForm
        action={createJob}
        customers={customers ?? []}
        defaultCustomerId={customer}
        submitLabel="Create job"
      />
    </div>
  )
}
