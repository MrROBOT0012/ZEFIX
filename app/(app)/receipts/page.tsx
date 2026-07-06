import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getCompanyId } from '@/lib/company'
import { formatCurrency, formatDate, formatPaymentMethod } from '@/lib/format'
import { matchesSearch } from '@/lib/search'
import ListFilterBar from '@/components/ListFilterBar'

export default async function ReceiptsPage({
  searchParams,
}: {
  searchParams: Promise<{ invoice?: string; q?: string; from?: string; to?: string }>
}) {
  const { invoice, q, from, to } = await searchParams
  const supabase = await createClient()
  const companyId = await getCompanyId()

  let query = supabase
    .from('receipts')
    .select('*')
    .eq('company_id', companyId)
    .order('payment_date', { ascending: false })
    .order('receipt_number', { ascending: false })

  if (invoice) query = query.eq('invoice_id', invoice)
  if (from) query = query.gte('payment_date', from)
  if (to) query = query.lte('payment_date', to)

  const [{ data: allReceipts }, { data: invoices }, { data: customers }] = await Promise.all([
    query,
    supabase.from('invoices').select('id, invoice_number').eq('company_id', companyId),
    supabase.from('customers').select('id, name').eq('company_id', companyId),
  ])

  const invoiceNumber = new Map((invoices ?? []).map((inv) => [inv.id, inv.invoice_number]))
  const customerName = new Map((customers ?? []).map((c) => [c.id, c.name]))
  const receipts = (allReceipts ?? []).filter((r) =>
    matchesSearch([r.receipt_number, invoiceNumber.get(r.invoice_id), customerName.get(r.customer_id)], q ?? '')
  )
  const hasActiveFilters = Boolean(q || from || to)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Receipts</h1>
        <p className="mt-1 text-sm text-gray-500">
          {receipts?.length ?? 0} receipt{receipts?.length !== 1 ? 's' : ''}
        </p>
      </div>

      <ListFilterBar
        basePath="/receipts"
        searchValue={q}
        searchPlaceholder="Search receipt #, invoice #, or customer…"
        dateFrom={from}
        dateTo={to}
        hasActiveFilters={hasActiveFilters}
      />

      {!receipts?.length ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
          {hasActiveFilters ? (
            <>
              <p className="text-sm font-medium text-gray-500">No receipts match your filters.</p>
              <Link href="/receipts" className="mt-3 inline-block text-sm text-blue-600 hover:text-blue-700">
                Clear filters
              </Link>
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-gray-500">No receipts yet.</p>
              <p className="mt-1 text-sm text-gray-400">
                Receipts are generated automatically when you record a payment on an invoice.
              </p>
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
                  <th className="px-6 py-3 font-semibold text-gray-600">#</th>
                  <th className="px-6 py-3 font-semibold text-gray-600">Date</th>
                  <th className="px-6 py-3 font-semibold text-gray-600">Invoice</th>
                  <th className="px-6 py-3 font-semibold text-gray-600">Customer</th>
                  <th className="px-6 py-3 font-semibold text-gray-600">Amount</th>
                  <th className="px-6 py-3 font-semibold text-gray-600">Method</th>
                  <th className="px-6 py-3 font-semibold text-gray-600">Remaining Balance</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {receipts.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">{r.receipt_number}</td>
                    <td className="px-6 py-4 text-gray-500">{formatDate(r.payment_date)}</td>
                    <td className="px-6 py-4">
                      <Link href={`/invoices/${r.invoice_id}`} className="text-blue-600 hover:text-blue-700 font-medium">
                        #{invoiceNumber.get(r.invoice_id) ?? '—'}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-gray-700">{customerName.get(r.customer_id) ?? '—'}</td>
                    <td className="px-6 py-4 text-gray-700">{formatCurrency(r.payment_amount)}</td>
                    <td className="px-6 py-4 text-gray-600">{formatPaymentMethod(r.payment_method)}</td>
                    <td className="px-6 py-4 text-gray-700">{formatCurrency(r.remaining_balance)}</td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/receipts/${r.id}`} className="text-blue-600 hover:text-blue-700 font-medium">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {receipts.map((r) => (
              <Link
                key={r.id}
                href={`/receipts/${r.id}`}
                className="flex items-center justify-between bg-white rounded-xl border border-gray-200 px-4 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900">Receipt #{r.receipt_number}</p>
                  </div>
                  <p className="text-sm text-gray-500 truncate">
                    Invoice #{invoiceNumber.get(r.invoice_id) ?? '—'} · {customerName.get(r.customer_id) ?? '—'}
                  </p>
                  <div className="mt-1 flex items-center gap-3 text-xs text-gray-400">
                    <span>{formatDate(r.payment_date)}</span>
                    <span>{formatCurrency(r.payment_amount)}</span>
                  </div>
                </div>
                <ChevronRight size={18} className="text-gray-300 shrink-0 ml-3" />
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
