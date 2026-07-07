import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Pencil } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency, formatDate } from '@/lib/format'
import StatTile from '@/components/charts/StatTile'
import { statusLabel, statusBadgeCls } from '../statusStyles'
import {
  statusLabel as estimateStatusLabel,
  statusBadgeCls as estimateStatusBadgeCls,
} from '../../estimates/statusStyles'
import {
  statusLabel as invoiceStatusLabel,
  statusBadgeCls as invoiceStatusBadgeCls,
  displayStatus as invoiceDisplayStatus,
} from '../../invoices/statusStyles'
import { deleteJob } from '../actions'
import DeleteButton from './DeleteButton'

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div>
      <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</dt>
      <dd className="mt-0.5 text-sm text-gray-900 whitespace-pre-line">{value}</dd>
    </div>
  )
}

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: job } = await supabase
    .from('jobs_summary')
    .select('*')
    .eq('id', id)
    .single()

  if (!job) notFound()

  const [{ data: customer }, { data: estimates }, { data: invoices }, { data: expenses }] = await Promise.all([
    job.customer_id
      ? supabase.from('customers').select('id, name, company_name').eq('id', job.customer_id).single()
      : Promise.resolve({ data: null }),
    supabase
      .from('estimates')
      .select('id, estimate_number, revision_number, estimate_date, total, status')
      .eq('job_id', id)
      .order('estimate_date', { ascending: false }),
    supabase
      .from('invoices')
      .select('id, invoice_number, invoice_date, due_date, total, balance_due, status')
      .eq('job_id', id)
      .order('invoice_date', { ascending: false }),
    supabase
      .from('expenses')
      .select('id, expense_date, vendor, amount')
      .eq('job_id', id)
      .order('expense_date', { ascending: false }),
  ])

  const deleteWithId = deleteJob.bind(null, id)

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Link href="/jobs" className="hover:text-gray-700">Jobs</Link>
            <span>/</span>
          </div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-gray-900">{job.job_name}</h1>
            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadgeCls[job.status]}`}>
              {statusLabel[job.status]}
            </span>
          </div>
          {customer && (
            <p className="mt-0.5 text-sm text-gray-500">
              <Link href={`/customers/${customer.id}`} className="hover:text-gray-700">
                {customer.name}
                {customer.company_name ? ` (${customer.company_name})` : ''}
              </Link>
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href={`/jobs/${id}/edit`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Pencil size={15} />
            Edit
          </Link>
          <DeleteButton action={deleteWithId} />
        </div>
      </div>

      {/* Job summary — from the jobs_summary view */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
        <StatTile label="Invoiced" value={formatCurrency(job.invoiced_amount)} />
        <StatTile label="Job Expenses" value={formatCurrency(job.job_expenses)} />
        <StatTile label="Actual Profit" value={formatCurrency(job.actual_profit)} />
      </div>

      {/* Info grid */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <InfoRow label="Location" value={job.location} />
          <InfoRow label="Start date" value={job.start_date ? formatDate(job.start_date) : null} />
          <InfoRow
            label="Quoted amount"
            value={job.quoted_amount != null ? formatCurrency(job.quoted_amount) : null}
          />
          {job.notes && (
            <div className="sm:col-span-2">
              <InfoRow label="Notes" value={job.notes} />
            </div>
          )}
          {!job.location && !job.start_date && job.quoted_amount == null && !job.notes && (
            <p className="sm:col-span-2 text-sm text-gray-400">No additional details recorded.</p>
          )}
        </dl>
      </div>

      {/* Estimates, Invoices & Expenses */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700">Estimates</h3>
            <Link href={`/estimates?job=${id}`} className="text-xs text-blue-600 hover:text-blue-700">
              View all
            </Link>
          </div>
          {!estimates?.length ? (
            <p className="text-sm text-gray-400">No estimates yet.</p>
          ) : (
            <div className="space-y-2">
              {estimates.map((e) => (
                <Link
                  key={e.id}
                  href={`/estimates/${e.id}`}
                  className="flex items-center justify-between rounded-lg px-2 py-1.5 -mx-2 hover:bg-gray-50 transition-colors"
                >
                  <span className="text-sm text-gray-700">
                    #{e.estimate_number}
                    {e.revision_number > 1 && (
                      <span className="ml-1 text-xs text-gray-400">Rev {e.revision_number}</span>
                    )}
                    <span className="ml-2 text-xs text-gray-400">{formatDate(e.estimate_date)}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="text-sm text-gray-700">{formatCurrency(e.total)}</span>
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${estimateStatusBadgeCls[e.status]}`}>
                      {estimateStatusLabel[e.status]}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700">Invoices</h3>
            <Link href={`/invoices?job=${id}`} className="text-xs text-blue-600 hover:text-blue-700">
              View all
            </Link>
          </div>
          {!invoices?.length ? (
            <p className="text-sm text-gray-400">No invoices yet.</p>
          ) : (
            <div className="space-y-2">
              {invoices.map((inv) => {
                const status = invoiceDisplayStatus(inv.status, inv.due_date)
                return (
                  <Link
                    key={inv.id}
                    href={`/invoices/${inv.id}`}
                    className="flex items-center justify-between rounded-lg px-2 py-1.5 -mx-2 hover:bg-gray-50 transition-colors"
                  >
                    <span className="text-sm text-gray-700">
                      #{inv.invoice_number}
                      <span className="ml-2 text-xs text-gray-400">{formatDate(inv.invoice_date)}</span>
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="text-sm text-gray-700">{formatCurrency(inv.balance_due)} due</span>
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${invoiceStatusBadgeCls[status]}`}>
                        {invoiceStatusLabel[status]}
                      </span>
                    </span>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 sm:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700">Expenses</h3>
            <Link href={`/expenses?job=${id}`} className="text-xs text-blue-600 hover:text-blue-700">
              View all
            </Link>
          </div>
          {!expenses?.length ? (
            <p className="text-sm text-gray-400">No expenses yet.</p>
          ) : (
            <div className="space-y-2">
              {expenses.map((ex) => (
                <Link
                  key={ex.id}
                  href={`/expenses/${ex.id}`}
                  className="flex items-center justify-between rounded-lg px-2 py-1.5 -mx-2 hover:bg-gray-50 transition-colors"
                >
                  <span className="text-sm text-gray-700">
                    {ex.vendor ?? 'Expense'}
                    <span className="ml-2 text-xs text-gray-400">{formatDate(ex.expense_date)}</span>
                  </span>
                  <span className="text-sm text-gray-700">{formatCurrency(ex.amount)}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
