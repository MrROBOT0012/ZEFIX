import { createClient } from '@/lib/supabase/server'
import { getCompanyId } from '@/lib/company'
import { createPayment } from '../actions'
import PaymentForm from '../PaymentForm'

export default async function NewPaymentPage({
  searchParams,
}: {
  searchParams: Promise<{ invoice?: string }>
}) {
  const { invoice: invoiceId } = await searchParams
  const supabase = await createClient()
  const companyId = await getCompanyId()

  const [{ data: invoices }, { data: customers }, { data: selectedInvoice }] = await Promise.all([
    supabase
      .from('invoices')
      .select('id, invoice_number, customer_id, balance_due')
      .eq('company_id', companyId)
      .neq('status', 'cancelled')
      .gt('balance_due', 0)
      .order('invoice_date', { ascending: false }),
    supabase.from('customers').select('id, name').eq('company_id', companyId),
    invoiceId
      ? supabase
          .from('invoices')
          .select('id, invoice_number, customer_id, balance_due')
          .eq('id', invoiceId)
          .single()
      : Promise.resolve({ data: null }),
  ])

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Record Payment</h1>
      </div>
      <PaymentForm
        action={createPayment}
        invoices={invoices ?? []}
        customers={customers ?? []}
        selectedInvoice={selectedInvoice}
      />
    </div>
  )
}
