import { createClient } from '@/lib/supabase/server'
import { getCompanyId } from '@/lib/company'
import {
  resolveRange,
  getPreviousRange,
  getPeriodSummary,
  getAccountsReceivable,
  getOwnerContributions,
  getInvoiceStatusCounts,
  getMonthlyRollup,
} from '@/lib/bookkeeping'
import { formatCurrency } from '@/lib/format'
import DateRangeFilter from '@/components/DateRangeFilter'
import StatTile, { computeDelta } from '@/components/charts/StatTile'
import { statusLabel } from '../invoices/statusStyles'

export default async function BookkeepingPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const companyId = await getCompanyId()

  const resolved = resolveRange(params)
  const previous = getPreviousRange(resolved)

  const [summary, previousSummary, ar, ownerContributions, statusCounts, monthly] = await Promise.all([
    getPeriodSummary(supabase, companyId, resolved.from, resolved.to),
    previous ? getPeriodSummary(supabase, companyId, previous.from, previous.to) : null,
    getAccountsReceivable(supabase, companyId),
    getOwnerContributions(supabase, companyId),
    getInvoiceStatusCounts(supabase, companyId),
    getMonthlyRollup(supabase, companyId, 12),
  ])

  const totalInvoices = Object.values(statusCounts).reduce((sum, n) => sum + n, 0)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Bookkeeping</h1>
        <p className="mt-1 text-sm text-gray-500">Cash-basis summary — income on payment received, expenses on expense date.</p>
      </div>

      <DateRangeFilter basePath="/bookkeeping" preset={resolved.preset} from={resolved.from} to={resolved.to} />

      {/* Stat row */}
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

      <div className="mb-6">
        <StatTile label="Owner Contributions (all time)" value={formatCurrency(ownerContributions)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly rollup table */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">Monthly Summary — Last 12 Months</h2>
          </div>
          {/* Desktop table */}
          <table className="hidden sm:table w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left">
                <th className="px-6 py-2 font-semibold text-gray-600">Month</th>
                <th className="px-6 py-2 font-semibold text-gray-600 text-right">Income</th>
                <th className="px-6 py-2 font-semibold text-gray-600 text-right">Expenses</th>
                <th className="px-6 py-2 font-semibold text-gray-600 text-right">Profit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {monthly.map((m) => (
                <tr key={m.monthKey}>
                  <td className="px-6 py-2.5 text-gray-900">{m.monthLabel}</td>
                  <td className="px-6 py-2.5 text-right text-gray-700">{formatCurrency(m.income)}</td>
                  <td className="px-6 py-2.5 text-right text-gray-700">{formatCurrency(m.expenses)}</td>
                  <td
                    className={`px-6 py-2.5 text-right font-medium ${m.profit < 0 ? 'text-red-600' : 'text-gray-900'}`}
                  >
                    {formatCurrency(m.profit)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Mobile simplified list */}
          <div className="sm:hidden divide-y divide-gray-100">
            {monthly.map((m) => (
              <div key={m.monthKey} className="px-4 py-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-900">{m.monthLabel}</span>
                  <span className={m.profit < 0 ? 'text-red-600 font-medium' : 'text-gray-900 font-medium'}>
                    {formatCurrency(m.profit)} profit
                  </span>
                </div>
                <div className="mt-0.5 text-xs text-gray-500">
                  {formatCurrency(m.income)} in · {formatCurrency(m.expenses)} out
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Invoice status counts */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden self-start">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">Invoices</h2>
          </div>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-gray-100">
              {(Object.keys(statusCounts) as Array<keyof typeof statusCounts>).map((status) => (
                <tr key={status}>
                  <td className="px-6 py-2.5 text-gray-700">{statusLabel[status]}</td>
                  <td className="px-6 py-2.5 text-right font-medium text-gray-900">{statusCounts[status]}</td>
                </tr>
              ))}
              <tr className="border-t border-gray-200">
                <td className="px-6 py-2.5 font-medium text-gray-900">Total</td>
                <td className="px-6 py-2.5 text-right font-semibold text-gray-900">{totalInvoices}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
