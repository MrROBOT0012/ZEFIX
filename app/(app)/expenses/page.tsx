import Link from 'next/link'
import { Plus, ChevronRight, Paperclip } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getCompanyId } from '@/lib/company'
import { formatCurrency, formatDate } from '@/lib/format'
import { matchesSearch } from '@/lib/search'
import ListFilterBar from '@/components/ListFilterBar'

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; job?: string; q?: string; from?: string; to?: string }>
}) {
  const { category, job, q, from, to } = await searchParams
  const supabase = await createClient()
  const companyId = await getCompanyId()

  let query = supabase
    .from('expenses')
    .select('id, expense_date, vendor, amount, category_id, job_id, is_owner_funded, receipt_available')
    .eq('company_id', companyId)
    .order('expense_date', { ascending: false })

  if (category) query = query.eq('category_id', category)
  if (job) query = query.eq('job_id', job)
  if (from) query = query.gte('expense_date', from)
  if (to) query = query.lte('expense_date', to)

  const [{ data: allExpenses }, { data: categories }, { data: jobs }] = await Promise.all([
    query,
    supabase.from('expense_categories').select('id, name').eq('company_id', companyId).order('name'),
    supabase.from('jobs').select('id, job_name').eq('company_id', companyId).order('job_name'),
  ])

  const categoryName = new Map((categories ?? []).map((c) => [c.id, c.name]))
  const jobName = new Map((jobs ?? []).map((j) => [j.id, j.job_name]))
  const expenses = (allExpenses ?? []).filter((e) => matchesSearch([e.vendor], q ?? ''))
  const hasActiveFilters = Boolean(q || category || job || from || to)
  const total = (expenses ?? []).reduce((sum, e) => sum + e.amount, 0)

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Expenses</h1>
          <p className="mt-1 text-sm text-gray-500">
            {expenses?.length ?? 0} expense{expenses?.length !== 1 ? 's' : ''} · {formatCurrency(total)} total
          </p>
        </div>
        <Link
          href="/expenses/new"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          New expense
        </Link>
      </div>

      <ListFilterBar
        basePath="/expenses"
        searchValue={q}
        searchPlaceholder="Search vendor…"
        dateFrom={from}
        dateTo={to}
        hasActiveFilters={hasActiveFilters}
      >
        <select
          name="category"
          defaultValue={category ?? ''}
          className="w-full sm:w-auto rounded-lg border border-gray-300 px-3 py-2.5 sm:py-1.5 text-sm text-gray-700"
        >
          <option value="">All categories</option>
          {(categories ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          name="job"
          defaultValue={job ?? ''}
          className="w-full sm:w-auto rounded-lg border border-gray-300 px-3 py-2.5 sm:py-1.5 text-sm text-gray-700"
        >
          <option value="">All jobs</option>
          {(jobs ?? []).map((j) => (
            <option key={j.id} value={j.id}>
              {j.job_name}
            </option>
          ))}
        </select>
      </ListFilterBar>

      {!expenses?.length ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
          {hasActiveFilters ? (
            <>
              <p className="text-sm font-medium text-gray-500">No expenses match your filters.</p>
              <Link href="/expenses" className="mt-3 inline-block text-sm text-blue-600 hover:text-blue-700">
                Clear filters
              </Link>
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-gray-500">No expenses yet.</p>
              <p className="mt-1 text-sm text-gray-400">Record your first expense to get started.</p>
              <Link
                href="/expenses/new"
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
              >
                <Plus size={16} />
                New expense
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
                  <th className="px-6 py-3 font-semibold text-gray-600">Vendor</th>
                  <th className="px-6 py-3 font-semibold text-gray-600">Category</th>
                  <th className="px-6 py-3 font-semibold text-gray-600">Job</th>
                  <th className="px-6 py-3 font-semibold text-gray-600">Amount</th>
                  <th className="px-6 py-3 font-semibold text-gray-600" />
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {expenses.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-gray-500">{formatDate(e.expense_date)}</td>
                    <td className="px-6 py-4 text-gray-900">{e.vendor ?? '—'}</td>
                    <td className="px-6 py-4 text-gray-600">{categoryName.get(e.category_id ?? '') ?? '—'}</td>
                    <td className="px-6 py-4 text-gray-600">{jobName.get(e.job_id ?? '') ?? '—'}</td>
                    <td className="px-6 py-4 text-gray-900 font-medium">{formatCurrency(e.amount)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {e.is_owner_funded && (
                          <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                            Owner
                          </span>
                        )}
                        {e.receipt_available && <Paperclip size={14} className="text-gray-400" />}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/expenses/${e.id}`} className="text-blue-600 hover:text-blue-700 font-medium">
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
            {expenses.map((e) => (
              <Link
                key={e.id}
                href={`/expenses/${e.id}`}
                className="flex items-center justify-between bg-white rounded-xl border border-gray-200 px-4 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900">{e.vendor ?? 'Expense'}</p>
                    {e.is_owner_funded && (
                      <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                        Owner
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 truncate">{categoryName.get(e.category_id ?? '') ?? '—'}</p>
                  <div className="mt-1 flex items-center gap-3 text-xs text-gray-400">
                    <span>{formatDate(e.expense_date)}</span>
                    <span>{formatCurrency(e.amount)}</span>
                    {e.receipt_available && <Paperclip size={12} />}
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
