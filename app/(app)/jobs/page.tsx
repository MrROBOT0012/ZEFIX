import Link from 'next/link'
import { Plus, ChevronRight, MapPin } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getCompanyId } from '@/lib/company'
import { formatCurrency } from '@/lib/format'
import { matchesSearch } from '@/lib/search'
import ListFilterBar from '@/components/ListFilterBar'
import { statusLabel, statusBadgeCls } from './statusStyles'
import type { JobStatus } from '@/types/database'

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>
}) {
  const { status, q } = await searchParams
  const supabase = await createClient()
  const companyId = await getCompanyId()

  let query = supabase
    .from('jobs')
    .select('id, job_name, location, status, quoted_amount, customer_id')
    .eq('company_id', companyId)
    .order('job_name')

  if (status) query = query.eq('status', status as JobStatus)

  const [{ data: allJobs }, { data: customers }] = await Promise.all([
    query,
    supabase.from('customers').select('id, name').eq('company_id', companyId),
  ])

  const customerName = new Map((customers ?? []).map((c) => [c.id, c.name]))
  const jobs = (allJobs ?? []).filter((j) => matchesSearch([j.job_name, j.location], q ?? ''))
  const hasActiveFilters = Boolean(q || status)

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Jobs</h1>
          <p className="mt-1 text-sm text-gray-500">
            {jobs?.length ?? 0} job{jobs?.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link
          href="/jobs/new"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          New job
        </Link>
      </div>

      <ListFilterBar
        basePath="/jobs"
        searchValue={q}
        searchPlaceholder="Search job name or location…"
        showDateRange={false}
        hasActiveFilters={hasActiveFilters}
      >
        <select
          name="status"
          defaultValue={status ?? ''}
          className="w-full sm:w-auto rounded-lg border border-gray-300 px-3 py-2.5 sm:py-1.5 text-sm text-gray-700"
        >
          <option value="">All statuses</option>
          {(Object.keys(statusLabel) as JobStatus[]).map((s) => (
            <option key={s} value={s}>
              {statusLabel[s]}
            </option>
          ))}
        </select>
      </ListFilterBar>

      {!jobs?.length ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
          {hasActiveFilters ? (
            <>
              <p className="text-sm font-medium text-gray-500">No jobs match your filters.</p>
              <Link href="/jobs" className="mt-3 inline-block text-sm text-blue-600 hover:text-blue-700">
                Clear filters
              </Link>
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-gray-500">No jobs yet.</p>
              <p className="mt-1 text-sm text-gray-400">Add your first job to start tracking profit.</p>
              <Link
                href="/jobs/new"
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
              >
                <Plus size={16} />
                New job
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
                  <th className="px-6 py-3 font-semibold text-gray-600">Job Name</th>
                  <th className="px-6 py-3 font-semibold text-gray-600">Customer</th>
                  <th className="px-6 py-3 font-semibold text-gray-600">Location</th>
                  <th className="px-6 py-3 font-semibold text-gray-600">Quoted Amount</th>
                  <th className="px-6 py-3 font-semibold text-gray-600">Status</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {jobs.map((j) => (
                  <tr key={j.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">{j.job_name}</td>
                    <td className="px-6 py-4 text-gray-500">{customerName.get(j.customer_id ?? '') ?? '—'}</td>
                    <td className="px-6 py-4 text-gray-500">{j.location ?? '—'}</td>
                    <td className="px-6 py-4 text-gray-500">
                      {j.quoted_amount != null ? formatCurrency(j.quoted_amount) : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${statusBadgeCls[j.status]}`}>
                        {statusLabel[j.status]}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/jobs/${j.id}`} className="text-blue-600 hover:text-blue-700 font-medium">
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
            {jobs.map((j) => (
              <Link
                key={j.id}
                href={`/jobs/${j.id}`}
                className="flex items-center justify-between bg-white rounded-xl border border-gray-200 px-4 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900 truncate">{j.job_name}</p>
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${statusBadgeCls[j.status]}`}>
                      {statusLabel[j.status]}
                    </span>
                  </div>
                  {customerName.get(j.customer_id ?? '') && (
                    <p className="text-sm text-gray-500 truncate">{customerName.get(j.customer_id ?? '')}</p>
                  )}
                  <div className="mt-1.5 flex items-center gap-3 text-xs text-gray-400">
                    {j.location && (
                      <span className="flex items-center gap-1 truncate">
                        <MapPin size={12} />
                        {j.location}
                      </span>
                    )}
                    {j.quoted_amount != null && <span>{formatCurrency(j.quoted_amount)}</span>}
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
