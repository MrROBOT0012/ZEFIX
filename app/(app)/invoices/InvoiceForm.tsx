'use client'

import { useActionState, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { FormField, inputCls } from '@/components/ui/FormField'
import LineItemsEditor, { emptyLineItems, type LineItemRow } from '@/components/LineItemsEditor'
import PdfPreviewModal from '@/components/PdfPreviewModal'
import { formatCurrency } from '@/lib/format'
import { useFormDraft } from '@/lib/hooks/useFormDraft'
import type { InvoiceActionState } from './actions'
import type { Invoice, InvoiceLineItem } from '@/types/database'

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
  action: (prev: InvoiceActionState, formData: FormData) => Promise<InvoiceActionState>
  invoice?: Invoice
  existingLineItems?: InvoiceLineItem[]
  customers: CustomerOption[]
  jobs: JobOption[]
  defaultCustomerId?: string
  defaultTaxRatePct: number
  defaultPaymentTerms?: string | null
  defaultPaymentInstructions?: string | null
  defaultNotes?: string | null
  submitLabel?: string
}

export default function InvoiceForm({
  action,
  invoice,
  existingLineItems,
  customers,
  jobs,
  defaultCustomerId,
  defaultTaxRatePct,
  defaultPaymentTerms,
  defaultPaymentInstructions,
  defaultNotes,
  submitLabel = 'Save invoice',
}: Props) {
  const [state, formAction, isPending] = useActionState<InvoiceActionState, FormData>(action, null)

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

  const [discount, setDiscount] = useState(invoice?.discount ?? 0)
  const [taxRatePct, setTaxRatePct] = useState(
    invoice ? invoice.tax_rate * 100 : defaultTaxRatePct
  )

  const [isPreviewLoading, setIsPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  function closePreview() {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
  }

  async function handlePreview() {
    if (!formRef.current) return
    setPreviewError(null)
    setIsPreviewLoading(true)
    try {
      const fd = new FormData(formRef.current)
      const customerId = (fd.get('customer_id') as string) || ''
      const customer = customers.find((c) => c.id === customerId) ?? null

      const res = await fetch('/invoices/preview-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer,
          invoice_type: fd.get('invoice_type'),
          invoice_date: fd.get('invoice_date'),
          due_date: fd.get('due_date') || null,
          billing_address: fd.get('billing_address'),
          job_location: fd.get('job_location'),
          job_name: fd.get('job_name'),
          equipment_info: fd.get('equipment_info'),
          po_number: fd.get('po_number'),
          description_of_work: fd.get('description_of_work'),
          payment_terms: fd.get('payment_terms'),
          payment_instructions: fd.get('payment_instructions'),
          notes: fd.get('notes'),
          discount,
          tax_rate: taxRatePct / 100,
          line_items: JSON.stringify(lineItems),
        }),
      })
      if (!res.ok) throw new Error('Failed to generate preview.')
      const blob = await res.blob()
      setPreviewUrl(URL.createObjectURL(blob))
    } catch {
      setPreviewError('Failed to generate preview. Please try again.')
    } finally {
      setIsPreviewLoading(false)
    }
  }

  const totals = useMemo(() => {
    const subtotal = lineItems.reduce((sum, li) => sum + li.quantity * li.unit_price, 0)
    const taxable = Math.max(0, subtotal - discount)
    const tax_amount = taxable * (taxRatePct / 100)
    const total = taxable + tax_amount
    return { subtotal, tax_amount, total }
  }, [lineItems, discount, taxRatePct])

  const { clearDraft } = useFormDraft('invoice:new', formRef, {
    enabled: !invoice,
    getExtra: () => ({ lineItems, discount, taxRatePct }),
    onRestore: (draft) => {
      if (Array.isArray(draft.lineItems)) setLineItems(draft.lineItems as LineItemRow[])
      if (typeof draft.discount === 'number') setDiscount(draft.discount)
      if (typeof draft.taxRatePct === 'number') setTaxRatePct(draft.taxRatePct)
    },
  })

  return (
    <>
    {previewUrl && <PdfPreviewModal url={previewUrl} onClose={closePreview} />}
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
              defaultValue={invoice?.customer_id ?? defaultCustomerId ?? ''}
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

          <FormField
            label="Job"
            hint={jobs.length > 0 ? 'Optional — links this invoice to a job for profit tracking.' : undefined}
          >
            <select name="job_id" defaultValue={invoice?.job_id ?? ''} className={inputCls}>
              <option value="">No job</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.job_name}
                </option>
              ))}
            </select>
            {jobs.length === 0 && (
              <p className="mt-1 text-xs text-gray-500">
                No jobs yet.{' '}
                <Link href="/jobs/new" target="_blank" className="text-blue-600 hover:text-blue-700">
                  + New Job
                </Link>
              </p>
            )}
          </FormField>

          <FormField label="Invoice Type">
            <select name="invoice_type" defaultValue={invoice?.invoice_type ?? 'standard'} className={inputCls}>
              <option value="standard">Standard</option>
              <option value="deposit">Deposit</option>
              <option value="final">Final</option>
            </select>
          </FormField>

          <FormField label="PO Number">
            <input
              name="po_number"
              type="text"
              defaultValue={invoice?.po_number ?? ''}
              className={inputCls}
            />
          </FormField>

          <FormField label="Invoice Date">
            <input
              name="invoice_date"
              type="date"
              defaultValue={invoice?.invoice_date ?? new Date().toISOString().slice(0, 10)}
              className={inputCls}
            />
          </FormField>

          <FormField label="Due Date">
            <input
              name="due_date"
              type="date"
              defaultValue={invoice?.due_date ?? ''}
              className={inputCls}
            />
          </FormField>

          <FormField label="Job Name">
            <input
              name="job_name"
              type="text"
              defaultValue={invoice?.job_name ?? ''}
              className={inputCls}
            />
          </FormField>

          <FormField label="Equipment Info">
            <input
              name="equipment_info"
              type="text"
              defaultValue={invoice?.equipment_info ?? ''}
              className={inputCls}
            />
          </FormField>

          <div className="sm:col-span-2">
            <FormField label="Billing Address">
              <textarea
                name="billing_address"
                rows={2}
                defaultValue={invoice?.billing_address ?? ''}
                className={inputCls}
              />
            </FormField>
          </div>

          <div className="sm:col-span-2">
            <FormField label="Job Location">
              <textarea
                name="job_location"
                rows={2}
                defaultValue={invoice?.job_location ?? ''}
                className={inputCls}
              />
            </FormField>
          </div>

          <div className="sm:col-span-2">
            <FormField label="Description of Work">
              <textarea
                name="description_of_work"
                rows={3}
                defaultValue={invoice?.description_of_work ?? ''}
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

      {/* ── Payment Terms & Notes ──────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Payment Terms &amp; Notes</h2>
        </div>
        <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Payment Terms">
            <input
              name="payment_terms"
              type="text"
              defaultValue={invoice?.payment_terms ?? defaultPaymentTerms ?? ''}
              placeholder="e.g. Net 30, Due on receipt"
              className={inputCls}
            />
          </FormField>
          <div />
          <div className="sm:col-span-2">
            <FormField label="Payment Instructions">
              <textarea
                name="payment_instructions"
                rows={3}
                defaultValue={invoice?.payment_instructions ?? defaultPaymentInstructions ?? ''}
                className={inputCls}
              />
            </FormField>
          </div>
          <div className="sm:col-span-2">
            <FormField label="Notes">
              <textarea
                name="notes"
                rows={3}
                defaultValue={invoice?.notes ?? defaultNotes ?? ''}
                className={inputCls}
              />
            </FormField>
          </div>
        </div>
      </div>

      {previewError && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {previewError}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {isPending ? 'Saving…' : submitLabel}
        </button>
        <button
          type="button"
          onClick={handlePreview}
          disabled={isPreviewLoading}
          className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          {isPreviewLoading ? 'Generating…' : 'Preview PDF'}
        </button>
        <Link href="/invoices" className="text-sm text-gray-500 hover:text-gray-700">
          Cancel
        </Link>
      </div>
    </form>
    </>
  )
}
