import { createClient } from '@/lib/supabase/server'
import { getCompany, getCompanyId } from '@/lib/company'
import { createInvoice } from '../actions'
import InvoiceForm from '../InvoiceForm'

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ customer?: string }>
}) {
  const { customer } = await searchParams
  const supabase = await createClient()
  const companyId = await getCompanyId()
  const company = await getCompany()

  const [{ data: customers }, { data: jobs }] = await Promise.all([
    supabase
      .from('customers')
      .select('id, name, company_name')
      .eq('company_id', companyId)
      .order('name'),
    supabase
      .from('jobs')
      .select('id, job_name')
      .eq('company_id', companyId)
      .order('job_name'),
  ])

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">New Invoice</h1>
      </div>
      <InvoiceForm
        action={createInvoice}
        customers={customers ?? []}
        jobs={jobs ?? []}
        defaultCustomerId={customer}
        defaultTaxRatePct={company.sales_tax_rate * 100}
        defaultPaymentTerms={company.default_payment_terms}
        defaultPaymentInstructions={company.default_payment_instructions}
        defaultNotes={company.default_invoice_notes}
        submitLabel="Create invoice"
      />
    </div>
  )
}
