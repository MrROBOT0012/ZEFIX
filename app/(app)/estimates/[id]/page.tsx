import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Pencil, Download } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency, formatDate } from '@/lib/format'
import { deleteEstimate } from '../actions'
import { statusLabel, statusBadgeCls } from '../statusStyles'
import DeleteButton from './DeleteButton'
import StatusActions from './StatusActions'

export default async function EstimateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: estimate } = await supabase.from('estimates').select('*').eq('id', id).single()
  if (!estimate) notFound()

  const [{ data: lineItems }, { data: customer }, { data: job }] = await Promise.all([
    supabase.from('estimate_line_items').select('*').eq('estimate_id', id).order('sort_order'),
    estimate.customer_id
      ? supabase.from('customers').select('id, name, company_name, billing_address').eq('id', estimate.customer_id).single()
      : Promise.resolve({ data: null }),
    estimate.job_id
      ? supabase.from('jobs').select('id, job_name').eq('id', estimate.job_id).single()
      : Promise.resolve({ data: null }),
  ])

  const [{ data: parent }, { data: revisions }, { data: convertedInvoice }] = await Promise.all([
    estimate.parent_estimate_id
      ? supabase.from('estimates').select('id, estimate_number, revision_number').eq('id', estimate.parent_estimate_id).single()
      : Promise.resolve({ data: null }),
    supabase
      .from('estimates')
      .select('id, estimate_number, revision_number, status')
      .eq('parent_estimate_id', id)
      .order('revision_number'),
    estimate.converted_invoice_id
      ? supabase.from('invoices').select('id, invoice_number').eq('id', estimate.converted_invoice_id).single()
      : Promise.resolve({ data: null }),
  ])

  const deleteWithId = deleteEstimate.bind(null, id)
  const canEdit = estimate.status === 'draft' || estimate.status === 'sent'
  const canDelete = estimate.status !== 'converted'

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Link href="/estimates" className="hover:text-gray-700">Estimates</Link>
            <span>/</span>
          </div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-gray-900">Estimate #{estimate.estimate_number}</h1>
            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadgeCls[estimate.status]}`}>
              {statusLabel[estimate.status]}
            </span>
          </div>
          {estimate.revision_number > 1 && (
            <p className="mt-0.5 text-sm text-gray-500">
              Revision {estimate.revision_number}
              {parent && (
                <>
                  {' · follows '}
                  <Link href={`/estimates/${parent.id}`} className="text-blue-600 hover:text-blue-700">
                    #{parent.estimate_number}
                  </Link>
                </>
              )}
            </p>
          )}
          {customer && <p className="mt-0.5 text-sm text-gray-500">{customer.name}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <a
            href={`/estimates/${id}/pdf`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Download size={15} />
            PDF
          </a>
          {canEdit && (
            <Link
              href={`/estimates/${id}/edit`}
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
        <StatusActions estimateId={id} status={estimate.status} />
      </div>

      {convertedInvoice && (
        <div className="mb-6 rounded-lg border border-purple-200 bg-purple-50 px-4 py-2.5 text-sm text-purple-800">
          Converted to{' '}
          <Link href={`/invoices/${convertedInvoice.id}`} className="font-medium hover:underline">
            Invoice #{convertedInvoice.invoice_number}
          </Link>
        </div>
      )}

      {revisions && revisions.length > 0 && (
        <div className="mb-6 rounded-lg border border-gray-200 bg-white px-4 py-3">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Later revisions</p>
          <div className="flex flex-wrap gap-2">
            {revisions.map((r) => (
              <Link
                key={r.id}
                href={`/estimates/${r.id}`}
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${statusBadgeCls[r.status]}`}
              >
                #{r.estimate_number} (Rev {r.revision_number})
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Job / dates info */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Estimate Date</dt>
            <dd className="mt-0.5 text-sm text-gray-900">{formatDate(estimate.estimate_date)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Expiration Date</dt>
            <dd className="mt-0.5 text-sm text-gray-900">{formatDate(estimate.expiration_date)}</dd>
          </div>
          {job && (
            <div>
              <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Job</dt>
              <dd className="mt-0.5 text-sm text-gray-900">{job.job_name}</dd>
            </div>
          )}
          {estimate.job_location && (
            <div>
              <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Job Location</dt>
              <dd className="mt-0.5 text-sm text-gray-900 whitespace-pre-line">{estimate.job_location}</dd>
            </div>
          )}
          {estimate.description_of_work && (
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Description of Work</dt>
              <dd className="mt-0.5 text-sm text-gray-900 whitespace-pre-line">{estimate.description_of_work}</dd>
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
              <span>{formatCurrency(estimate.subtotal)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Discount</span>
              <span>-{formatCurrency(estimate.discount)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Tax ({(estimate.tax_rate * 100).toFixed(2)}%)</span>
              <span>{formatCurrency(estimate.tax_amount)}</span>
            </div>
            <div className="flex justify-between text-base font-semibold text-gray-900 pt-1.5 border-t border-gray-100">
              <span>Total</span>
              <span>{formatCurrency(estimate.total)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Notes & terms */}
      {(estimate.notes || estimate.terms) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {estimate.notes && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Notes</h3>
              <p className="text-sm text-gray-600 whitespace-pre-line">{estimate.notes}</p>
            </div>
          )}
          {estimate.terms && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Terms</h3>
              <p className="text-sm text-gray-600 whitespace-pre-line">{estimate.terms}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
