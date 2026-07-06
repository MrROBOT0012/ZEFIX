'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { FormField, inputCls } from '@/components/ui/FormField'
import { formatCurrency } from '@/lib/format'
import type { PaymentActionState } from './actions'

interface InvoiceOption {
  id: string
  invoice_number: number
  customer_id: string | null
  balance_due: number
}

interface CustomerOption {
  id: string
  name: string
}

interface Props {
  action: (prev: PaymentActionState, formData: FormData) => Promise<PaymentActionState>
  invoices: InvoiceOption[]
  customers: CustomerOption[]
  selectedInvoice?: InvoiceOption | null
}

export default function PaymentForm({ action, invoices, customers, selectedInvoice }: Props) {
  const [state, formAction, isPending] = useActionState<PaymentActionState, FormData>(action, null)
  const customerName = new Map(customers.map((c) => [c.id, c.name]))
  const cancelHref = selectedInvoice ? `/invoices/${selectedInvoice.id}` : '/payments'

  return (
    <form action={formAction} className="space-y-6 max-w-lg">
      {state?.error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {state.error}
        </p>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Invoice</h2>
        </div>
        <div className="px-6 py-5">
          {selectedInvoice ? (
            <div>
              <input type="hidden" name="invoice_id" value={selectedInvoice.id} />
              <p className="text-sm font-medium text-gray-900">Invoice #{selectedInvoice.invoice_number}</p>
              <p className="mt-0.5 text-sm text-gray-500">
                {customerName.get(selectedInvoice.customer_id ?? '') ?? '—'} · Balance due{' '}
                {formatCurrency(selectedInvoice.balance_due)}
              </p>
            </div>
          ) : (
            <FormField label="Invoice" required error={state?.fieldErrors?.invoice_id}>
              <select name="invoice_id" required defaultValue="" className={inputCls}>
                <option value="" disabled>
                  Select an invoice…
                </option>
                {invoices.map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    #{inv.invoice_number} — {customerName.get(inv.customer_id ?? '') ?? '—'} —{' '}
                    {formatCurrency(inv.balance_due)} due
                  </option>
                ))}
              </select>
            </FormField>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Payment Details</h2>
        </div>
        <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Amount ($)" required error={state?.fieldErrors?.amount}>
            <input
              name="amount"
              type="number"
              step="0.01"
              min="0.01"
              defaultValue={selectedInvoice ? selectedInvoice.balance_due : undefined}
              className={inputCls}
            />
          </FormField>

          <FormField label="Payment Date">
            <input
              name="payment_date"
              type="date"
              defaultValue={new Date().toISOString().slice(0, 10)}
              className={inputCls}
            />
          </FormField>

          <FormField label="Payment Method">
            <select name="payment_method" defaultValue="other" className={inputCls}>
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

          <FormField label="Reference Number">
            <input name="reference_number" type="text" className={inputCls} />
          </FormField>

          <div className="sm:col-span-2">
            <FormField label="Notes">
              <textarea name="notes" rows={3} className={inputCls} />
            </FormField>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {isPending ? 'Saving…' : 'Record payment'}
        </button>
        <Link href={cancelHref} className="text-sm text-gray-500 hover:text-gray-700">
          Cancel
        </Link>
      </div>
    </form>
  )
}
