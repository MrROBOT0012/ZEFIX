import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCompanyId } from '@/lib/company'
import { updateInvoice } from '../../actions'
import InvoiceForm from '../../InvoiceForm'

export default async function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const companyId = await getCompanyId()

  const [{ data: invoice }, { data: lineItems }, { data: customers }, { data: jobs }] =
    await Promise.all([
      supabase.from('invoices').select('*').eq('id', id).single(),
      supabase.from('invoice_line_items').select('*').eq('invoice_id', id).order('sort_order'),
      supabase.from('customers').select('id, name, company_name').eq('company_id', companyId).order('name'),
      supabase.from('jobs').select('id, job_name').eq('company_id', companyId).order('job_name'),
    ])

  if (!invoice) notFound()

  const updateWithId = updateInvoice.bind(null, id)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Edit Invoice</h1>
        <p className="mt-1 text-sm text-gray-500">#{invoice.invoice_number}</p>
      </div>
      <InvoiceForm
        action={updateWithId}
        invoice={invoice}
        existingLineItems={lineItems ?? []}
        customers={customers ?? []}
        jobs={jobs ?? []}
        defaultTaxRatePct={invoice.tax_rate * 100}
        submitLabel="Save changes"
      />
    </div>
  )
}
