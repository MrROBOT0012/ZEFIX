import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCompanyId } from '@/lib/company'
import { updateExpense } from '../../actions'
import ExpenseForm from '../../ExpenseForm'

export default async function EditExpensePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const companyId = await getCompanyId()

  const { data: expense } = await supabase.from('expenses').select('*').eq('id', id).single()
  if (!expense) notFound()

  const [{ data: categories }, { data: jobs }, { data: customers }, { data: invoices }] = await Promise.all([
    supabase.from('expense_categories').select('id, name').eq('company_id', companyId).order('name'),
    supabase.from('jobs').select('id, job_name').eq('company_id', companyId).order('job_name'),
    supabase.from('customers').select('id, name').eq('company_id', companyId).order('name'),
    supabase.from('invoices').select('id, invoice_number').eq('company_id', companyId).order('invoice_number', { ascending: false }),
  ])

  let existingReceiptUrl: string | null = null
  if (expense.receipt_attachment_url) {
    const { data: signed } = await supabase.storage
      .from('receipts')
      .createSignedUrl(expense.receipt_attachment_url, 3600)
    existingReceiptUrl = signed?.signedUrl ?? null
  }

  const updateWithId = updateExpense.bind(null, id)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Edit Expense</h1>
        <p className="mt-1 text-sm text-gray-500">{expense.vendor ?? 'Expense'}</p>
      </div>
      <ExpenseForm
        action={updateWithId}
        expense={expense}
        categories={categories ?? []}
        jobs={jobs ?? []}
        customers={customers ?? []}
        invoices={invoices ?? []}
        existingReceiptUrl={existingReceiptUrl}
        submitLabel="Save changes"
      />
    </div>
  )
}
