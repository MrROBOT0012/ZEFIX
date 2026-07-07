'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { FormField, inputCls } from '@/components/ui/FormField'
import type { JobActionState } from './actions'
import type { Job, JobStatus } from '@/types/database'

interface CustomerOption {
  id: string
  name: string
  company_name: string | null
}

interface Props {
  action: (prev: JobActionState, formData: FormData) => Promise<JobActionState>
  job?: Job
  customers: CustomerOption[]
  defaultCustomerId?: string
  submitLabel?: string
}

const STATUS_OPTIONS: { value: JobStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'on_hold', label: 'On Hold' },
]

export default function JobForm({
  action,
  job,
  customers,
  defaultCustomerId,
  submitLabel = 'Save job',
}: Props) {
  const [state, formAction, isPending] = useActionState<JobActionState, FormData>(action, null)

  return (
    <form action={formAction} className="space-y-6 max-w-2xl">
      {state?.error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {state.error}
        </p>
      )}

      {/* ── Job Details ────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Job Details</h2>
        </div>
        <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Job Name" required error={state?.fieldErrors?.job_name}>
            <input
              name="job_name"
              type="text"
              required
              defaultValue={job?.job_name ?? ''}
              className={inputCls}
            />
          </FormField>

          <FormField label="Customer">
            <select
              name="customer_id"
              defaultValue={job?.customer_id ?? defaultCustomerId ?? ''}
              className={inputCls}
            >
              <option value="">No customer</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.company_name ? ` (${c.company_name})` : ''}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Status">
            <select name="status" defaultValue={job?.status ?? 'active'} className={inputCls}>
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Start Date">
            <input
              name="start_date"
              type="date"
              defaultValue={job?.start_date ?? ''}
              className={inputCls}
            />
          </FormField>

          <FormField label="Quoted Amount ($)">
            <input
              name="quoted_amount"
              type="number"
              step="0.01"
              min="0"
              defaultValue={job?.quoted_amount ?? ''}
              className={inputCls}
            />
          </FormField>

          <div className="sm:col-span-2">
            <FormField label="Location">
              <textarea
                name="location"
                rows={2}
                defaultValue={job?.location ?? ''}
                className={inputCls}
              />
            </FormField>
          </div>
        </div>
      </div>

      {/* ── Notes ──────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Notes</h2>
        </div>
        <div className="px-6 py-5">
          <textarea
            name="notes"
            rows={4}
            defaultValue={job?.notes ?? ''}
            placeholder="Internal notes about this job…"
            className={inputCls}
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {isPending ? 'Saving…' : submitLabel}
        </button>
        <Link href="/jobs" className="text-sm text-gray-500 hover:text-gray-700">
          Cancel
        </Link>
      </div>
    </form>
  )
}
