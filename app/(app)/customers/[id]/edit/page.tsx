import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { updateCustomer } from '../../actions'
import CustomerForm from '../../CustomerForm'

export default async function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: customer } = await supabase
    .from('customers')
    .select('*')
    .eq('id', id)
    .single()

  if (!customer) notFound()

  const updateWithId = updateCustomer.bind(null, id)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Edit Customer</h1>
        <p className="mt-1 text-sm text-gray-500">{customer.name}</p>
      </div>
      <CustomerForm action={updateWithId} customer={customer} submitLabel="Save changes" />
    </div>
  )
}
