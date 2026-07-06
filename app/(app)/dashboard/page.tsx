import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getCompanyId } from '@/lib/company'
import {
  resolveRange,
  getPreviousRange,
  getPeriodSummary,
  getAccountsReceivable,
  getInvoiceStatusCounts,
  getMonthlyRollup,
} from '@/lib/bookkeeping'
import { formatCurrency, formatDate, formatPaymentMethod } from '@/lib/format'
import DateRangeFilter from '@/components/DateRangeFilter'
import StatTile, { computeDelta } from '@/components/charts/StatTile'
import MonthlyBarChart from '@/components/charts/MonthlyBarChart'
import ProfitLineChart from '@/components/charts/ProfitLineChart'
import InvoiceStatusBreakdown from '@/components/charts/InvoiceStatusBreakdown'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const companyId = await getCompanyId()

  const resolved = resolveRange(params)
  const previous = getPreviousRange(resolved)

  const [summary, previousSummary, ar, statusCounts, monthly, invoices, customers, payments, expenses, categories] =
    await Promise.all([
      getPeriodSummary(supabase, companyId, resolved.from, resolved.to),
      previous ? getPeriodSummary(supabase, companyId, previous.from, previous.to) : null,
      getAccountsReceivable(supabase, companyId),
      getInvoiceStatusCounts(supabase, companyId),
      getMonthlyRollup(supabase, companyId, 6),
      supabase
        .from('invoices')
        .select('id, invoice_number, invoice_date, total, customer_id')
        .eq('company_id', companyId)
        .order('invoice_date', { ascending: false })
        .limit(5),
      supabase.from('customers').select('id, name').eq('company_id', companyId),
      supabase
        .from('payments')
        .select('id, invoice_id, payment_date, amount, payment_method')
        .order('payment_date', { ascending: false })
        .limit(5),
      supabase
        .from('expenses')
        .select('id, expense_date, vendor, amount, category_id')
        .eq('company_id', companyId)
        .order('expense_date', { ascending: false })
        .limit(5),
      supabase.from('expense_categories').select('id, name').eq('company_id', companyId),
    ])

  const customerName = new Map((customers.data ?? []).map((c) => [c.id, c.name]))
  const categoryName = new Map((categories.data ?? []).map((c) => [c.id, c.name]))

  const recentInvoices = invoices.data

  // Recent payments need the invoice number — fetch just the invoices referenced.
  const paymentInvoiceIds = [...new Set((payments.data ?? []).map((p) => p.invoice_id))]
  const { data: paymentInvoices } = paymentInvoiceIds.length
    ? await supabase.from('invoices').select('id, invoice_number, customer_id').in('id', paymentInvoiceIds)
    : { data: [] }
  const invoiceById = new Map((paymentInvoices ?? []).map((i) => [i.id, i]))

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
      </div>

      <DateRangeFilter basePath="/dashboard" preset={resolved.preset} from={resolved.from} to={resolved.to} />

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatTile
          label={`Income — ${resolved.label}`}
          value={formatCurrency(summary.income)}
          delta={previousSummary ? computeDelta(summary.income, previousSummary.income, 'up') : undefined}
        />
        <StatTile
          label={`Expenses — ${resolved.label}`}
          value={formatCurrency(summary.expenses)}
          delta={previousSummary ? computeDelta(summary.expenses, previousSummary.expenses, 'down') : undefined}
        />
        <StatTile
          label={`Profit — ${resolved.label}`}
          value={formatCurrency(summary.profit)}
          delta={previousSummary ? computeDelta(summary.profit, previousSummary.profit, 'up') : undefined}
        />
        <StatTile label="Accounts Receivable" value={formatCurrency(ar)} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold text-gray-700 mb-1">Income vs Expenses</h2>
          <p className="text-xs text-gray-400 mb-3">Last 6 months</p>
          <MonthlyBarChart data={monthly} />
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Invoices by Status</h2>
          <InvoiceStatusBreakdown counts={statusCounts} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold text-gray-700 mb-1">Profit Trend</h2>
          <p className="text-xs text-gray-400 mb-3">Last 6 months</p>
          <ProfitLineChart data={monthly} />
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Recent Expenses</h2>
          {!expenses.data?.length ? (
            <p className="text-sm text-gray-400">No expenses yet.</p>
          ) : (
            <div className="space-y-2">
              {expenses.data.map((e) => (
                <Link
                  key={e.id}
                  href={`/expenses/${e.id}`}
                  className="flex items-center justify-between rounded-lg px-2 py-1.5 -mx-2 hover:bg-gray-50 transition-colors"
                >
                  <span className="text-sm text-gray-700 truncate">
                    {e.vendor ?? categoryName.get(e.category_id ?? '') ?? 'Expense'}
                    <span className="ml-2 text-xs text-gray-400">{formatDate(e.expense_date)}</span>
                  </span>
                  <span className="text-sm text-gray-900 shrink-0 ml-2">{formatCurrency(e.amount)}</span>
                </Link>
              ))}
            </div>
          )}
          <Link href="/expenses" className="mt-3 inline-block text-xs text-blue-600 hover:text-blue-700">
            View all
          </Link>
        </div>
      </div>

      {/* Recent activity */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Recent Invoices</h2>
          {!recentInvoices?.length ? (
            <p className="text-sm text-gray-400">No invoices yet.</p>
          ) : (
            <div className="space-y-2">
              {recentInvoices.map((inv) => (
                <Link
                  key={inv.id}
                  href={`/invoices/${inv.id}`}
                  className="flex items-center justify-between rounded-lg px-2 py-1.5 -mx-2 hover:bg-gray-50 transition-colors"
                >
                  <span className="text-sm text-gray-700">
                    #{inv.invoice_number}
                    <span className="ml-2 text-xs text-gray-400">
                      {customerName.get(inv.customer_id ?? '') ?? '—'} · {formatDate(inv.invoice_date)}
                    </span>
                  </span>
                  <span className="text-sm text-gray-900 shrink-0 ml-2">{formatCurrency(inv.total)}</span>
                </Link>
              ))}
            </div>
          )}
          <Link href="/invoices" className="mt-3 inline-block text-xs text-blue-600 hover:text-blue-700">
            View all
          </Link>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Recent Payments</h2>
          {!payments.data?.length ? (
            <p className="text-sm text-gray-400">No payments yet.</p>
          ) : (
            <div className="space-y-2">
              {payments.data.map((p) => {
                const inv = invoiceById.get(p.invoice_id)
                return (
                  <Link
                    key={p.id}
                    href={inv ? `/invoices/${inv.id}` : '/payments'}
                    className="flex items-center justify-between rounded-lg px-2 py-1.5 -mx-2 hover:bg-gray-50 transition-colors"
                  >
                    <span className="text-sm text-gray-700">
                      {inv ? `#${inv.invoice_number}` : '—'}
                      <span className="ml-2 text-xs text-gray-400">
                        {customerName.get(inv?.customer_id ?? '') ?? '—'} · {formatDate(p.payment_date)} ·{' '}
                        {formatPaymentMethod(p.payment_method)}
                      </span>
                    </span>
                    <span className="text-sm text-gray-900 shrink-0 ml-2">{formatCurrency(p.amount)}</span>
                  </Link>
                )
              })}
            </div>
          )}
          <Link href="/payments" className="mt-3 inline-block text-xs text-blue-600 hover:text-blue-700">
            View all
          </Link>
        </div>
      </div>
    </div>
  )
}
