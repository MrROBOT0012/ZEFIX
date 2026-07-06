import Link from 'next/link'
import { Plus, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getCompanyId } from '@/lib/company'
import { formatCurrency, formatDate, formatPaymentMethod } from '@/lib/format'
import { matchesSearch } from '@/lib/search'
import ListFilterBar from '@/components/ListFilterBar'
import { deletePayment } from './actions'
import DeleteButton from './DeleteButton'

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ invoice?: string; q?: string; from?: string; to?: string }>
}) {
  const { invoice, q, from, to } = await searchParams
  const supabase = await createClient()
  const companyId = await getCompanyId()

  const [{ data: invoices }, { data: customers }] = await Promise.all([
    supabase.from('invoices').select('id, invoice_number, customer_id').eq('company_id', companyId),
    supabase.from('customers').select('id, name').eq('company_id', companyId),
  ])

  const invoiceIds = (invoices ?? []).map((inv) => inv.id)
  const invoiceById = new Map((invoices ?? []).map((inv) => [inv.id, inv]))
  const customerName = new Map((customers ?? []).map((c) => [c.id, c.name]))

  let query = supabase
    .from('payments')
    .select('*')
    .in('invoice_id', invoiceIds.length ? invoiceIds : ['00000000-0000-0000-0000-000000000000'])
    .order('payment_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (invoice) query = query.eq('invoice_id', invoice)
  if (from) query = query.gte('payment_date', from)
  if (to) query = query.lte('payment_date', to)

  const { data: allPayments } = await query
  const payments = (allPayments ?? []).filter((p) => {
    const inv = invoiceById.get(p.invoice_id)
    return matchesSearch([inv?.invoice_number, customerName.get(inv?.customer_id ?? ''), p.reference_number], q ?? '')
  })
  const hasActiveFilters = Boolean(q || from || to)

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Payments</h1>
          <p className="mt-1 text-sm text-gray-500">
            {payments?.length ?? 0} payment{payments?.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link
          href="/payments/new"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          Record payment
        </Link>
      </div>

      <ListFilterBar
        basePath="/payments"
        searchValue={q}
        searchPlaceholder="Search invoice #, customer, or reference…"
        dateFrom={from}
        dateTo={to}
        hasActiveFilters={hasActiveFilters}
      />

      {!payments?.length ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
          {hasActiveFilters ? (
            <>
              <p className="text-sm font-medium text-gray-500">No payments match your filters.</p>
              <Link href="/payments" className="mt-3 inline-block text-sm text-blue-600 hover:text-blue-700">
                Clear filters
              </Link>
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-gray-500">No payments recorded yet.</p>
              <p className="mt-1 text-sm text-gray-400">Record a payment against an invoice to get started.</p>
              <Link
                href="/payments/new"
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
              >
                <Plus size={16} />
                Record payment
              </Link>
            </>
          )}
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-left">
                  <th className="px-6 py-3 font-semibold text-gray-600">Date</th>
                  <th className="px-6 py-3 font-semibold text-gray-600">Invoice</th>
                  <th className="px-6 py-3 font-semibold text-gray-600">Customer</th>
                  <th className="px-6 py-3 font-semibold text-gray-600">Amount</th>
                  <th className="px-6 py-3 font-semibold text-gray-600">Method</th>
                  <th className="px-6 py-3 font-semibold text-gray-600">Reference</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payments.map((p) => {
                  const inv = invoiceById.get(p.invoice_id)
                  return (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-gray-500">{formatDate(p.payment_date)}</td>
                      <td className="px-6 py-4">
                        {inv ? (
                          <Link href={`/invoices/${inv.id}`} className="text-blue-600 hover:text-blue-700 font-medium">
                            #{inv.invoice_number}
                          </Link>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-700">
                        {customerName.get(inv?.customer_id ?? '') ?? '—'}
                      </td>
                      <td className="px-6 py-4 text-gray-900 font-medium">{formatCurrency(p.amount)}</td>
                      <td className="px-6 py-4 text-gray-600">{formatPaymentMethod(p.payment_method)}</td>
                      <td className="px-6 py-4 text-gray-500">{p.reference_number ?? '—'}</td>
                      <td className="px-6 py-4 text-right">
                        <DeleteButton action={deletePayment.bind(null, p.id)} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {payments.map((p) => {
              const inv = invoiceById.get(p.invoice_id)
              return (
                <Link
                  key={p.id}
                  href={inv ? `/invoices/${inv.id}` : '/payments'}
                  className="flex items-center justify-between bg-white rounded-xl border border-gray-200 px-4 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900">{formatCurrency(p.amount)}</p>
                      <span className="text-xs text-gray-400">{formatPaymentMethod(p.payment_method)}</span>
                    </div>
                    <p className="text-sm text-gray-500 truncate">
                      {inv ? `Invoice #${inv.invoice_number}` : '—'} · {customerName.get(inv?.customer_id ?? '') ?? '—'}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">{formatDate(p.payment_date)}</p>
                  </div>
                  <ChevronRight size={18} className="text-gray-300 shrink-0 ml-3" />
                </Link>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
