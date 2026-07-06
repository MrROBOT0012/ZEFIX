'use client'

import { useActionState, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { FormField, inputCls } from '@/components/ui/FormField'
import LineItemsEditor, { emptyLineItems, type LineItemRow } from '@/components/LineItemsEditor'
import { formatCurrency } from '@/lib/format'
import { useFormDraft } from '@/lib/hooks/useFormDraft'
import type { EstimateActionState } from './actions'
import type { Estimate, EstimateLineItem } from '@/types/database'

interface CustomerOption {
  id: string
  name: string
  company_name: string | null
}

interface JobOption {
  id: string
  job_name: string
}

interface Props {
  action: (prev: EstimateActionState, formData: FormData) => Promise<EstimateActionState>
  estimate?: Estimate
  existingLineItems?: EstimateLineItem[]
  customers: CustomerOption[]
  jobs: JobOption[]
  defaultCustomerId?: string
  defaultTaxRatePct: number
  submitLabel?: string
}

export default function EstimateForm({
  action,
  estimate,
  existingLineItems,
  customers,
  jobs,
  defaultCustomerId,
  defaultTaxRatePct,
  submitLabel = 'Save estimate',
}: Props) {
  const [state, formAction, isPending] = useActionState<EstimateActionState, FormData>(action, null)

  const [lineItems, setLineItems] = useState<LineItemRow[]>(() => {
    if (existingLineItems && existingLineItems.length > 0) {
      return existingLineItems
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((li) => ({
          key: li.id,
          description: li.description,
          quantity: li.quantity,
          unit_price: li.unit_price,
        }))
    }
    return emptyLineItems()
  })

  const [discount, setDiscount] = useState(estimate?.discount ?? 0)
  const [taxRatePct, setTaxRatePct] = useState(
    estimate ? estimate.tax_rate * 100 : defaultTaxRatePct
  )

  const totals = useMemo(() => {
    const subtotal = lineItems.reduce((sum, li) => sum + li.quantity * li.unit_price, 0)
    const taxable = Math.max(0, subtotal - discount)
    const tax_amount = taxable * (taxRatePct / 100)
    const total = taxable + tax_amount
    return { subtotal, tax_amount, total }
  }, [lineItems, discount, taxRatePct])

  const formRef = useRef<HTMLFormElement>(null)
  const { clearDraft } = useFormDraft('estimate:new', formRef, {
    enabled: !estimate,
    getExtra: () => ({ lineItems, discount, taxRatePct }),
    onRestore: (draft) => {
      if (Array.isArray(draft.lineItems)) setLineItems(draft.lineItems as LineItemRow[])
      if (typeof draft.discount === 'number') setDiscount(draft.discount)
      if (typeof draft.taxRatePct === 'number') setTaxRatePct(draft.taxRatePct)
    },
  })

  return (
    <form ref={formRef} action={formAction} onSubmit={clearDraft} className="space-y-6 max-w-3xl">
      <input type="hidden" name="line_items" value={JSON.stringify(lineItems)} />

      {state?.error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {state.error}
        </p>
      )}

      {/* ── Customer & Job ─────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Customer &amp; Job</h2>
        </div>
        <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Customer" required error={state?.fieldErrors?.customer_id}>
            <select
              name="customer_id"
              required
              defaultValue={estimate?.customer_id ?? defaultCustomerId ?? ''}
              className={inputCls}
            >
              <option value="" disabled>
                Select a customer…
              </option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.company_name ? ` (${c.company_name})` : ''}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Job" hint="Optional — links this estimate to a job for profit tracking.">
            <select name="job_id" defaultValue={estimate?.job_id ?? ''} className={inputCls}>
              <option value="">No job</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.job_name}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Estimate Date">
            <input
              name="estimate_date"
              type="date"
              defaultValue={estimate?.estimate_date ?? new Date().toISOString().slice(0, 10)}
              className={inputCls}
            />
          </FormField>

          <FormField label="Expiration Date">
            <input
              name="expiration_date"
              type="date"
              defaultValue={estimate?.expiration_date ?? ''}
              className={inputCls}
            />
          </FormField>

          <FormField label="Job Name">
            <input
              name="job_name"
              type="text"
              defaultValue={estimate?.job_name ?? ''}
              className={inputCls}
            />
          </FormField>

          <FormField label="Equipment Info">
            <input
              name="equipment_info"
              type="text"
              defaultValue={estimate?.equipment_info ?? ''}
              className={inputCls}
            />
          </FormField>

          <div className="sm:col-span-2">
            <FormField label="Job Location">
              <textarea
                name="job_location"
                rows={2}
                defaultValue={estimate?.job_location ?? ''}
                className={inputCls}
              />
            </FormField>
          </div>

          <div className="sm:col-span-2">
            <FormField label="Description of Work">
              <textarea
                name="description_of_work"
                rows={3}
                defaultValue={estimate?.description_of_work ?? ''}
                className={inputCls}
              />
            </FormField>
          </div>
        </div>
      </div>

      {/* ── Line Items ─────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Line Items</h2>
        </div>
        <div className="px-6 py-5">
          <LineItemsEditor
            value={lineItems}
            onChange={setLineItems}
            error={state?.fieldErrors?.line_items}
          />
        </div>
      </div>

      {/* ── Totals ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Totals</h2>
        </div>
        <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Discount ($)">
            <input
              name="discount"
              type="number"
              step="0.01"
              min="0"
              value={discount}
              onChange={(e) => setDiscount(Number(e.target.value) || 0)}
              className={inputCls}
            />
          </FormField>

          <FormField label="Tax Rate (%)" hint="Defaults from Settings; override per document as needed.">
            <input
              name="tax_rate"
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={taxRatePct}
              onChange={(e) => setTaxRatePct(Number(e.target.value) || 0)}
              className={inputCls}
            />
          </FormField>

          <div className="sm:col-span-2 border-t border-gray-100 pt-4 space-y-1.5 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>{formatCurrency(totals.subtotal)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Discount</span>
              <span>-{formatCurrency(discount)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Tax</span>
              <span>{formatCurrency(totals.tax_amount)}</span>
            </div>
            <div className="flex justify-between text-base font-semibold text-gray-900 pt-1.5 border-t border-gray-100">
              <span>Total</span>
              <span>{formatCurrency(totals.total)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Notes & Terms ──────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Notes &amp; Terms</h2>
        </div>
        <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Notes">
            <textarea
              name="notes"
              rows={3}
              defaultValue={estimate?.notes ?? ''}
              className={inputCls}
            />
          </FormField>
          <FormField label="Terms">
            <textarea
              name="terms"
              rows={3}
              defaultValue={estimate?.terms ?? ''}
              className={inputCls}
            />
          </FormField>
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
        <Link href="/estimates" className="text-sm text-gray-500 hover:text-gray-700">
          Cancel
        </Link>
      </div>
    </form>
  )
}
