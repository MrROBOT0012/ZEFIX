import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Pencil, Download } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency, formatDate } from '@/lib/format'
import { deleteInvoice } from '../actions'
import { statusLabel, statusBadgeCls, displayStatus } from '../statusStyles'
import DeleteButton from './DeleteButton'
import StatusActions from './StatusActions'
import PaymentsList from './PaymentsList'

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: invoice } = await supabase.from('invoices').select('*').eq('id', id).single()
  if (!invoice) notFound()

  const [{ data: lineItems }, { data: customer }, { data: job }, { data: sourceEstimate }, { data: payments }, { data: receipts }] =
    await Promise.all([
      supabase.from('invoice_line_items').select('*').eq('invoice_id', id).order('sort_order'),
      invoice.customer_id
        ? supabase.from('customers').select('id, name, company_name').eq('id', invoice.customer_id).single()
        : Promise.resolve({ data: null }),
      invoice.job_id
        ? supabase.from('jobs').select('id, job_name').eq('id', invoice.job_id).single()
        : Promise.resolve({ data: null }),
      invoice.source_estimate_id
        ? supabase.from('estimates').select('id, estimate_number').eq('id', invoice.source_estimate_id).single()
        : Promise.resolve({ data: null }),
      supabase.from('payments').select('*').eq('invoice_id', id).order('payment_date', { ascending: false }),
      supabase.from('receipts').select('id, payment_id').eq('invoice_id', id),
    ])

  const receiptIdByPayment = new Map((receipts ?? []).map((r) => [r.payment_id, r.id]))

  const deleteWithId = deleteInvoice.bind(null, id)
  const status = displayStatus(invoice.status, invoice.due_date)
  const canEdit = invoice.status === 'draft' || invoice.status === 'sent'
  const canDelete = invoice.amount_paid === 0
  const canRecordPayment = invoice.status !== 'cancelled' && invoice.status !== 'draft' && invoice.balance_due > 0

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Link href="/invoices" className="hover:text-gray-700">Invoices</Link>
            <span>/</span>
          </div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-gray-900">Invoice #{invoice.invoice_number}</h1>
            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadgeCls[status]}`}>
              {statusLabel[status]}
            </span>
          </div>
          {sourceEstimate && (
            <p className="mt-0.5 text-sm text-gray-500">
              Converted from{' '}
              <Link href={`/estimates/${sourceEstimate.id}`} className="text-blue-600 hover:text-blue-700">
                Estimate #{sourceEstimate.estimate_number}
              </Link>
            </p>
          )}
          {customer && <p className="mt-0.5 text-sm text-gray-500">{customer.name}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <a
            href={`/invoices/${id}/pdf`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Download size={15} />
            PDF
          </a>
          {canEdit && (
            <Link
              href={`/invoices/${id}/edit`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Pencil size={15} />
              Edit
            </Link>
          )}
          {canDelete && <DeleteButton action={deleteWithId} />}
        </div>
      </div>

      {/* Status actions */}
      <div className="mb-6">
        <StatusActions invoiceId={id} status={invoice.status} />
      </div>

      {/* Job / dates info */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Invoice Date</dt>
            <dd className="mt-0.5 text-sm text-gray-900">{formatDate(invoice.invoice_date)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Due Date</dt>
            <dd className="mt-0.5 text-sm text-gray-900">{formatDate(invoice.due_date)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Invoice Type</dt>
            <dd className="mt-0.5 text-sm text-gray-900 capitalize">{invoice.invoice_type}</dd>
          </div>
          {invoice.po_number && (
            <div>
              <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">PO Number</dt>
              <dd className="mt-0.5 text-sm text-gray-900">{invoice.po_number}</dd>
            </div>
          )}
          {job && (
            <div>
              <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Job</dt>
              <dd className="mt-0.5 text-sm text-gray-900">{job.job_name}</dd>
            </div>
          )}
          {invoice.billing_address && (
            <div>
              <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Billing Address</dt>
              <dd className="mt-0.5 text-sm text-gray-900 whitespace-pre-line">{invoice.billing_address}</dd>
            </div>
          )}
          {invoice.job_location && (
            <div>
              <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Job Location</dt>
              <dd className="mt-0.5 text-sm text-gray-900 whitespace-pre-line">{invoice.job_location}</dd>
            </div>
          )}
          {invoice.description_of_work && (
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Description of Work</dt>
              <dd className="mt-0.5 text-sm text-gray-900 whitespace-pre-line">{invoice.description_of_work}</dd>
            </div>
          )}
        </dl>
      </div>

      {/* Line items */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Line Items</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-left">
              <th className="px-6 py-2 font-semibold text-gray-600">Description</th>
              <th className="px-6 py-2 font-semibold text-gray-600 text-right">Qty</th>
              <th className="px-6 py-2 font-semibold text-gray-600 text-right">Unit Price</th>
              <th className="px-6 py-2 font-semibold text-gray-600 text-right">Line Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(lineItems ?? []).map((li) => (
              <tr key={li.id}>
                <td className="px-6 py-3 text-gray-900">{li.description}</td>
                <td className="px-6 py-3 text-right text-gray-600">{li.quantity}</td>
                <td className="px-6 py-3 text-right text-gray-600">{formatCurrency(li.unit_price)}</td>
                <td className="px-6 py-3 text-right text-gray-900">{formatCurrency(li.line_total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
          <div className="w-56 space-y-1.5 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>{formatCurrency(invoice.subtotal)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Discount</span>
              <span>-{formatCurrency(invoice.discount)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Tax ({(invoice.tax_rate * 100).toFixed(2)}%)</span>
              <span>{formatCurrency(invoice.tax_amount)}</span>
            </div>
            <div className="flex justify-between text-base font-semibold text-gray-900 pt-1.5 border-t border-gray-100">
              <span>Total</span>
              <span>{formatCurrency(invoice.total)}</span>
            </div>
            <div className="flex justify-between text-gray-600 pt-1.5">
              <span>Amount Paid</span>
              <span>{formatCurrency(invoice.amount_paid)}</span>
            </div>
            <div className="flex justify-between font-semibold text-gray-900">
              <span>Balance Due</span>
              <span>{formatCurrency(invoice.balance_due)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Payments */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">Payments</h2>
          {canRecordPayment && (
            <Link
              href={`/payments/new?invoice=${id}`}
              className="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              Record payment
            </Link>
          )}
        </div>
        <PaymentsList payments={payments ?? []} receiptIdByPayment={Object.fromEntries(receiptIdByPayment)} />
      </div>

      {/* Payment terms & notes */}
      {(invoice.payment_terms || invoice.payment_instructions || invoice.notes) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {(invoice.payment_terms || invoice.payment_instructions) && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Payment Terms</h3>
              {invoice.payment_terms && <p className="text-sm text-gray-600 mb-1">{invoice.payment_terms}</p>}
              {invoice.payment_instructions && (
                <p className="text-sm text-gray-600 whitespace-pre-line">{invoice.payment_instructions}</p>
              )}
            </div>
          )}
          {invoice.notes && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Notes</h3>
              <p className="text-sm text-gray-600 whitespace-pre-line">{invoice.notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
