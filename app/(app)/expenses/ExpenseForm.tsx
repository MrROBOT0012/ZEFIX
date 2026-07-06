'use client'

import { useActionState, useRef, useState } from 'react'
import Link from 'next/link'
import { FormField, inputCls } from '@/components/ui/FormField'
import { useFormDraft } from '@/lib/hooks/useFormDraft'
import type { ExpenseActionState } from './actions'
import type { Expense } from '@/types/database'

interface CategoryOption {
  id: string
  name: string
}

interface JobOption {
  id: string
  job_name: string
}

interface CustomerOption {
  id: string
  name: string
}

interface InvoiceOption {
  id: string
  invoice_number: number
}

interface Props {
  action: (prev: ExpenseActionState, formData: FormData) => Promise<ExpenseActionState>
  expense?: Expense
  categories: CategoryOption[]
  jobs: JobOption[]
  customers: CustomerOption[]
  invoices: InvoiceOption[]
  existingReceiptUrl?: string | null
  submitLabel?: string
}

export default function ExpenseForm({
  action,
  expense,
  categories,
  jobs,
  customers,
  invoices,
  existingReceiptUrl,
  submitLabel = 'Save expense',
}: Props) {
  const [state, formAction, isPending] = useActionState<ExpenseActionState, FormData>(action, null)
  const [preview, setPreview] = useState<string | null>(null)
  const [removeReceipt, setRemoveReceipt] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const { clearDraft } = useFormDraft('expense:new', formRef, { enabled: !expense })

  return (
    <form ref={formRef} action={formAction} onSubmit={clearDraft} className="space-y-6 max-w-2xl">
      {state?.error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {state.error}
        </p>
      )}

      {/* ── Expense Details ────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Expense Details</h2>
        </div>
        <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Date" required error={state?.fieldErrors?.expense_date}>
            <input
              name="expense_date"
              type="date"
              defaultValue={expense?.expense_date ?? new Date().toISOString().slice(0, 10)}
              className={inputCls}
            />
          </FormField>

          <FormField label="Amount ($)" required error={state?.fieldErrors?.amount}>
            <input
              name="amount"
              type="number"
              step="0.01"
              min="0.01"
              defaultValue={expense?.amount ?? ''}
              className={inputCls}
            />
          </FormField>

          <FormField label="Vendor">
            <input name="vendor" type="text" defaultValue={expense?.vendor ?? ''} className={inputCls} />
          </FormField>

          <FormField label="Category">
            <select name="category_id" defaultValue={expense?.category_id ?? ''} className={inputCls}>
              <option value="">Uncategorized</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Payment Method">
            <select name="payment_method" defaultValue={expense?.payment_method ?? ''} className={inputCls}>
              <option value="">Not specified</option>
              <option value="cash">Cash</option>
              <option value="check">Check</option>
              <option value="ach">ACH</option>
              <option value="wire">Wire</option>
              <option value="zelle">Zelle</option>
              <option value="credit_card">Credit Card</option>
              <option value="debit_card">Debit Card</option>
              <option value="other">Other</option>
            </select>
          </FormField>

          <FormField label="Job" hint="Optional — links this expense to a job for profit tracking.">
            <select name="job_id" defaultValue={expense?.job_id ?? ''} className={inputCls}>
              <option value="">No job</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.job_name}
                </option>
              ))}
            </select>
          </FormField>

          <div className="sm:col-span-2">
            <FormField label="Description">
              <textarea
                name="description"
                rows={2}
                defaultValue={expense?.description ?? ''}
                className={inputCls}
              />
            </FormField>
          </div>
        </div>
      </div>

      {/* ── Links ──────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Links</h2>
          <p className="mt-0.5 text-xs text-gray-500">Optional — tie this expense to a customer or invoice.</p>
        </div>
        <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Related Customer">
            <select name="related_customer_id" defaultValue={expense?.related_customer_id ?? ''} className={inputCls}>
              <option value="">None</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Related Invoice">
            <select name="related_invoice_id" defaultValue={expense?.related_invoice_id ?? ''} className={inputCls}>
              <option value="">None</option>
              {invoices.map((inv) => (
                <option key={inv.id} value={inv.id}>
                  #{inv.invoice_number}
                </option>
              ))}
            </select>
          </FormField>
        </div>
      </div>

      {/* ── Owner Funded ───────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-5">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              name="is_owner_funded"
              defaultChecked={expense?.is_owner_funded ?? false}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span>
              <span className="block text-sm font-medium text-gray-900">Owner-funded</span>
              <span className="block text-xs text-gray-500">
                Joel personally paid this — the business still counts it as an expense but tracks what&apos;s owed back to him.
              </span>
            </span>
          </label>
        </div>
      </div>

      {/* ── Receipt ────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Receipt</h2>
        </div>
        <div className="px-6 py-5 space-y-4">
          {existingReceiptUrl && !removeReceipt && (
            <div className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2">
              <a
                href={existingReceiptUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                View current receipt
              </a>
              <button
                type="button"
                onClick={() => setRemoveReceipt(true)}
                className="text-sm text-red-600 hover:text-red-700"
              >
                Remove
              </button>
            </div>
          )}
          {removeReceipt && (
            <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-3 py-2">
              <span className="text-sm text-red-700">Receipt will be removed when saved.</span>
              <input type="hidden" name="remove_receipt" value="on" />
              <button
                type="button"
                onClick={() => setRemoveReceipt(false)}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                Undo
              </button>
            </div>
          )}

          <FormField label={existingReceiptUrl ? 'Replace receipt (photo or PDF)' : 'Receipt (photo or PDF)'}>
            <input
              name="receipt_file"
              type="file"
              accept="image/*,application/pdf"
              capture="environment"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f && f.type.startsWith('image/')) {
                  setPreview(URL.createObjectURL(f))
                } else {
                  setPreview(null)
                }
              }}
              className="block w-full text-sm text-gray-700 file:mr-3 file:rounded-lg file:border file:border-gray-300 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-gray-700 hover:file:bg-gray-50"
            />
          </FormField>

          {preview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Receipt preview" className="max-h-48 rounded-lg border border-gray-200" />
          )}

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="receipt_available"
              defaultChecked={expense?.receipt_available ?? false}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Receipt available (paper or digital)</span>
          </label>
        </div>
      </div>

      {/* ── Notes ──────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Notes</h2>
        </div>
        <div className="px-6 py-5">
          <textarea name="notes" rows={3} defaultValue={expense?.notes ?? ''} className={inputCls} />
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
        <Link href="/expenses" className="text-sm text-gray-500 hover:text-gray-700">
          Cancel
        </Link>
      </div>
    </form>
  )
}
