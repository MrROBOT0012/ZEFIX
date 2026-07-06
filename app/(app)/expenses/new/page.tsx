import { createClient } from '@/lib/supabase/server'
import { getCompanyId } from '@/lib/company'
import { createExpense } from '../actions'
import ExpenseForm from '../ExpenseForm'

export default async function NewExpensePage() {
  const supabase = await createClient()
  const companyId = await getCompanyId()

  const [{ data: categories }, { data: jobs }, { data: customers }, { data: invoices }] = await Promise.all([
    supabase.from('expense_categories').select('id, name').eq('company_id', companyId).order('name'),
    supabase.from('jobs').select('id, job_name').eq('company_id', companyId).order('job_name'),
    supabase.from('customers').select('id, name').eq('company_id', companyId).order('name'),
    supabase.from('invoices').select('id, invoice_number').eq('company_id', companyId).order('invoice_number', { ascending: false }),
  ])

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">New Expense</h1>
      </div>
      <ExpenseForm
        action={createExpense}
        categories={categories ?? []}
        jobs={jobs ?? []}
        customers={customers ?? []}
        invoices={invoices ?? []}
        submitLabel="Create expense"
      />
    </div>
  )
}
