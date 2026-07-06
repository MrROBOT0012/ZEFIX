import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Pencil } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency, formatDate, formatPaymentMethod } from '@/lib/format'
import { deleteExpense } from '../actions'
import DeleteButton from './DeleteButton'

const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'heic'])

export default async function ExpenseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: expense } = await supabase.from('expenses').select('*').eq('id', id).single()
  if (!expense) notFound()

  const [{ data: category }, { data: job }, { data: customer }, { data: invoice }] = await Promise.all([
    expense.category_id
      ? supabase.from('expense_categories').select('name').eq('id', expense.category_id).single()
      : Promise.resolve({ data: null }),
    expense.job_id
      ? supabase.from('jobs').select('id, job_name').eq('id', expense.job_id).single()
      : Promise.resolve({ data: null }),
    expense.related_customer_id
      ? supabase.from('customers').select('id, name').eq('id', expense.related_customer_id).single()
      : Promise.resolve({ data: null }),
    expense.related_invoice_id
      ? supabase.from('invoices').select('id, invoice_number').eq('id', expense.related_invoice_id).single()
      : Promise.resolve({ data: null }),
  ])

  let receiptUrl: string | null = null
  if (expense.receipt_attachment_url) {
    const { data: signed } = await supabase.storage
      .from('receipts')
      .createSignedUrl(expense.receipt_attachment_url, 3600)
    receiptUrl = signed?.signedUrl ?? null
  }

  const ext = expense.receipt_attachment_url?.split('.').pop()?.toLowerCase() ?? ''
  const isImage = IMAGE_EXTENSIONS.has(ext)

  const deleteWithId = deleteExpense.bind(null, id)

  return (
    <div className="max-w-2xl">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Link href="/expenses" className="hover:text-gray-700">Expenses</Link>
            <span>/</span>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">{expense.vendor ?? 'Expense'}</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            {formatDate(expense.expense_date)} · {formatCurrency(expense.amount)}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href={`/expenses/${id}/edit`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Pencil size={15} />
            Edit
          </Link>
          <DeleteButton action={deleteWithId} />
        </div>
      </div>

      {expense.is_owner_funded && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
          Owner-funded — Joel personally paid this expense.
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Category</dt>
            <dd className="mt-0.5 text-sm text-gray-900">{category?.name ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Payment Method</dt>
            <dd className="mt-0.5 text-sm text-gray-900">
              {expense.payment_method ? formatPaymentMethod(expense.payment_method) : '—'}
            </dd>
          </div>
          {job && (
            <div>
              <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Job</dt>
              <dd className="mt-0.5 text-sm text-gray-900">{job.job_name}</dd>
            </div>
          )}
          {customer && (
            <div>
              <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Related Customer</dt>
              <dd className="mt-0.5 text-sm text-gray-900">
                <Link href={`/customers/${customer.id}`} className="text-blue-600 hover:text-blue-700">
                  {customer.name}
                </Link>
              </dd>
            </div>
          )}
          {invoice && (
            <div>
              <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Related Invoice</dt>
              <dd className="mt-0.5 text-sm text-gray-900">
                <Link href={`/invoices/${invoice.id}`} className="text-blue-600 hover:text-blue-700">
                  #{invoice.invoice_number}
                </Link>
              </dd>
            </div>
          )}
          {expense.description && (
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Description</dt>
              <dd className="mt-0.5 text-sm text-gray-900 whitespace-pre-line">{expense.description}</dd>
            </div>
          )}
          {expense.notes && (
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Notes</dt>
              <dd className="mt-0.5 text-sm text-gray-900 whitespace-pre-line">{expense.notes}</dd>
            </div>
          )}
        </dl>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Receipt</h2>
        {!expense.receipt_available && !receiptUrl && (
          <p className="text-sm text-gray-400">No receipt recorded.</p>
        )}
        {expense.receipt_available && !receiptUrl && (
          <p className="text-sm text-gray-500">Receipt available (not yet uploaded).</p>
        )}
        {receiptUrl && isImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={receiptUrl} alt="Expense receipt" className="max-h-72 rounded-lg border border-gray-200" />
        )}
        {receiptUrl && !isImage && (
          <a href={receiptUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:text-blue-700">
            View receipt (PDF)
          </a>
        )}
      </div>
    </div>
  )
}
