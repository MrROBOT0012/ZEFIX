import Link from 'next/link'
import { Plus, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getCompanyId } from '@/lib/company'
import { formatCurrency, formatDate } from '@/lib/format'
import { matchesSearch } from '@/lib/search'
import ListFilterBar from '@/components/ListFilterBar'
import { statusLabel, statusBadgeCls, displayStatus } from './statusStyles'
import type { InvoiceStatus } from '@/types/database'

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ customer?: string; q?: string; status?: string; from?: string; to?: string }>
}) {
  const { customer, q, status, from, to } = await searchParams
  const supabase = await createClient()
  const companyId = await getCompanyId()

  let query = supabase
    .from('invoices')
    .select('id, invoice_number, invoice_date, due_date, total, balance_due, status, customer_id')
    .eq('company_id', companyId)
    .order('invoice_date', { ascending: false })
    .order('invoice_number', { ascending: false })

  if (customer) query = query.eq('customer_id', customer)
  if (from) query = query.gte('invoice_date', from)
  if (to) query = query.lte('invoice_date', to)
  if (status === 'overdue') {
    query = query.in('status', ['sent', 'partially_paid']).lt('due_date', new Date().toISOString().slice(0, 10))
  } else if (status) {
    query = query.eq('status', status as InvoiceStatus)
  }

  const [{ data: allInvoices }, { data: customers }] = await Promise.all([
    query,
    supabase.from('customers').select('id, name').eq('company_id', companyId),
  ])

  const customerName = new Map((customers ?? []).map((c) => [c.id, c.name]))
  const invoices = (allInvoices ?? []).filter((inv) =>
    matchesSearch([inv.invoice_number, customerName.get(inv.customer_id ?? '')], q ?? '')
  )
  const hasActiveFilters = Boolean(q || status || from || to)

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Invoices</h1>
          <p className="mt-1 text-sm text-gray-500">
            {invoices?.length ?? 0} invoice{invoices?.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link
          href="/invoices/new"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          New invoice
        </Link>
      </div>

      <ListFilterBar
        basePath="/invoices"
        searchValue={q}
        searchPlaceholder="Search invoice # or customer…"
        dateFrom={from}
        dateTo={to}
        hasActiveFilters={hasActiveFilters}
      >
        <select
          name="status"
          defaultValue={status ?? ''}
          className="w-full sm:w-auto rounded-lg border border-gray-300 px-3 py-2.5 sm:py-1.5 text-sm text-gray-700"
        >
          <option value="">All statuses</option>
          {(Object.keys(statusLabel) as InvoiceStatus[]).map((s) => (
            <option key={s} value={s}>
              {statusLabel[s]}
            </option>
          ))}
        </select>
      </ListFilterBar>

      {!invoices?.length ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
          {hasActiveFilters ? (
            <>
              <p className="text-sm font-medium text-gray-500">No invoices match your filters.</p>
              <Link href="/invoices" className="mt-3 inline-block text-sm text-blue-600 hover:text-blue-700">
                Clear filters
              </Link>
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-gray-500">No invoices yet.</p>
              <p className="mt-1 text-sm text-gray-400">Create your first invoice to get started.</p>
              <Link
                href="/invoices/new"
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
              >
                <Plus size={16} />
                New invoice
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
                  <th className="px-6 py-3 font-semibold text-gray-600">#</th>
                  <th className="px-6 py-3 font-semibold text-gray-600">Customer</th>
                  <th className="px-6 py-3 font-semibold text-gray-600">Date</th>
                  <th className="px-6 py-3 font-semibold text-gray-600">Due</th>
                  <th className="px-6 py-3 font-semibold text-gray-600">Total</th>
                  <th className="px-6 py-3 font-semibold text-gray-600">Balance</th>
                  <th className="px-6 py-3 font-semibold text-gray-600">Status</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoices.map((inv) => {
                  const status = displayStatus(inv.status, inv.due_date)
                  return (
                    <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900">{inv.invoice_number}</td>
                      <td className="px-6 py-4 text-gray-700">{customerName.get(inv.customer_id ?? '') ?? '—'}</td>
                      <td className="px-6 py-4 text-gray-500">{formatDate(inv.invoice_date)}</td>
                      <td className="px-6 py-4 text-gray-500">{formatDate(inv.due_date)}</td>
                      <td className="px-6 py-4 text-gray-700">{formatCurrency(inv.total)}</td>
                      <td className="px-6 py-4 text-gray-700">{formatCurrency(inv.balance_due)}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadgeCls[status]}`}>
                          {statusLabel[status]}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link href={`/invoices/${inv.id}`} className="text-blue-600 hover:text-blue-700 font-medium">
                          View
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {invoices.map((inv) => {
              const status = displayStatus(inv.status, inv.due_date)
              return (
                <Link
                  key={inv.id}
                  href={`/invoices/${inv.id}`}
                  className="flex items-center justify-between bg-white rounded-xl border border-gray-200 px-4 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900">#{inv.invoice_number}</p>
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${statusBadgeCls[status]}`}>
                        {statusLabel[status]}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 truncate">{customerName.get(inv.customer_id ?? '') ?? '—'}</p>
                    <div className="mt-1 flex items-center gap-3 text-xs text-gray-400">
                      <span>{formatDate(inv.invoice_date)}</span>
                      <span>{formatCurrency(inv.total)} total</span>
                      <span>{formatCurrency(inv.balance_due)} due</span>
                    </div>
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
