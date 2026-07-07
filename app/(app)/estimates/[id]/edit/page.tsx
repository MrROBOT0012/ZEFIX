import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCompany, getCompanyId } from '@/lib/company'
import { updateEstimate } from '../../actions'
import EstimateForm from '../../EstimateForm'

export default async function EditEstimatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const companyId = await getCompanyId()
  const company = await getCompany()

  const [{ data: estimate }, { data: lineItems }, { data: customers }, { data: jobs }] =
    await Promise.all([
      supabase.from('estimates').select('*').eq('id', id).single(),
      supabase.from('estimate_line_items').select('*').eq('estimate_id', id).order('sort_order'),
      supabase.from('customers').select('id, name, company_name, billing_address').eq('company_id', companyId).order('name'),
      supabase.from('jobs').select('id, job_name').eq('company_id', companyId).order('job_name'),
    ])

  if (!estimate) notFound()

  const updateWithId = updateEstimate.bind(null, id)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Edit Estimate</h1>
        <p className="mt-1 text-sm text-gray-500">
          #{estimate.estimate_number}
          {estimate.revision_number > 1 ? ` · Revision ${estimate.revision_number}` : ''}
        </p>
      </div>
      <EstimateForm
        action={updateWithId}
        estimate={estimate}
        existingLineItems={lineItems ?? []}
        customers={customers ?? []}
        jobs={jobs ?? []}
        defaultTaxRatePct={company.sales_tax_rate * 100}
        submitLabel="Save changes"
      />
    </div>
  )
}
