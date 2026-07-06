import { createCustomer } from '../actions'
import CustomerForm from '../CustomerForm'

export default function NewCustomerPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">New Customer</h1>
      </div>
      <CustomerForm action={createCustomer} submitLabel="Create customer" />
    </div>
  )
}
