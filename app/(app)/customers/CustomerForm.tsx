'use client'

import { useActionState } from 'react'
import { FormField, inputCls } from '@/components/ui/FormField'
import type { CustomerActionState } from './actions'
import type { Customer } from '@/types/database'

interface Props {
  action: (prev: CustomerActionState, formData: FormData) => Promise<CustomerActionState>
  customer?: Customer
  submitLabel?: string
}

export default function CustomerForm({ action, customer, submitLabel = 'Save customer' }: Props) {
  const [state, formAction, isPending] = useActionState<CustomerActionState, FormData>(
    action,
    null
  )

  return (
    <form action={formAction} className="space-y-6 max-w-2xl">
      {state?.error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {state.error}
        </p>
      )}

      {/* ── Contact ────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Contact</h2>
        </div>
        <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Name" required error={state?.fieldErrors?.name}>
            <input
              name="name"
              type="text"
              required
              defaultValue={customer?.name ?? ''}
              className={inputCls}
            />
          </FormField>

          <FormField label="Company / Business Name">
            <input
              name="company_name"
              type="text"
              defaultValue={customer?.company_name ?? ''}
              className={inputCls}
            />
          </FormField>

          <FormField label="Contact Person">
            <input
              name="contact_person"
              type="text"
              defaultValue={customer?.contact_person ?? ''}
              className={inputCls}
            />
          </FormField>

          <FormField label="Email">
            <input
              name="email"
              type="email"
              inputMode="email"
              defaultValue={customer?.email ?? ''}
              className={inputCls}
            />
          </FormField>

          <FormField label="Phone">
            <input
              name="phone"
              type="tel"
              inputMode="tel"
              defaultValue={customer?.phone ?? ''}
              className={inputCls}
            />
          </FormField>
        </div>
      </div>

      {/* ── Addresses ──────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Addresses</h2>
        </div>
        <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Billing Address">
            <textarea
              name="billing_address"
              rows={3}
              defaultValue={customer?.billing_address ?? ''}
              className={inputCls}
            />
          </FormField>

          <FormField label="Default Job Location">
            <textarea
              name="job_location"
              rows={3}
              defaultValue={customer?.job_location ?? ''}
              className={inputCls}
            />
          </FormField>
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
            defaultValue={customer?.notes ?? ''}
            placeholder="Internal notes about this customer…"
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
        <a href="/customers" className="text-sm text-gray-500 hover:text-gray-700">
          Cancel
        </a>
      </div>
    </form>
  )
}
