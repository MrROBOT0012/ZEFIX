import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Download } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency, formatDate, formatPaymentMethod } from '@/lib/format'

export default async function ReceiptDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: receipt } = await supabase.from('receipts').select('*').eq('id', id).single()
  if (!receipt) notFound()

  const [{ data: invoice }, { data: customer }] = await Promise.all([
    supabase.from('invoices').select('id, invoice_number').eq('id', receipt.invoice_id).single(),
    supabase.from('customers').select('id, name, company_name').eq('id', receipt.customer_id).single(),
  ])

  return (
    <div className="max-w-2xl">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Link href="/receipts" className="hover:text-gray-700">Receipts</Link>
            <span>/</span>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">Receipt #{receipt.receipt_number}</h1>
          {customer && <p className="mt-0.5 text-sm text-gray-500">{customer.name}</p>}
        </div>
        <a
          href={`/receipts/${id}/pdf`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shrink-0"
        >
          <Download size={15} />
          PDF
        </a>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Payment Date</dt>
            <dd className="mt-0.5 text-sm text-gray-900">{formatDate(receipt.payment_date)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Invoice</dt>
            <dd className="mt-0.5 text-sm text-gray-900">
              {invoice ? (
                <Link href={`/invoices/${invoice.id}`} className="text-blue-600 hover:text-blue-700">
                  #{invoice.invoice_number}
                </Link>
              ) : (
                '—'
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Amount Received</dt>
            <dd className="mt-0.5 text-sm text-gray-900">{formatCurrency(receipt.payment_amount)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Payment Method</dt>
            <dd className="mt-0.5 text-sm text-gray-900">{formatPaymentMethod(receipt.payment_method)}</dd>
          </div>
          {receipt.reference_number && (
            <div>
              <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Reference Number</dt>
              <dd className="mt-0.5 text-sm text-gray-900">{receipt.reference_number}</dd>
            </div>
          )}
          <div>
            <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Remaining Balance</dt>
            <dd className="mt-0.5 text-sm text-gray-900">{formatCurrency(receipt.remaining_balance)}</dd>
          </div>
          {receipt.notes && (
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Notes</dt>
              <dd className="mt-0.5 text-sm text-gray-900 whitespace-pre-line">{receipt.notes}</dd>
            </div>
          )}
        </dl>
      </div>
    </div>
  )
}
