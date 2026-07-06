import Link from 'next/link'
import { Plus, Phone, Mail, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getCompanyId } from '@/lib/company'
import { matchesSearch } from '@/lib/search'
import ListFilterBar from '@/components/ListFilterBar'

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const supabase = await createClient()
  const companyId = await getCompanyId()

  const { data: allCustomers } = await supabase
    .from('customers')
    .select('id, name, company_name, phone, email')
    .eq('company_id', companyId)
    .order('name')

  const customers = (allCustomers ?? []).filter((c) =>
    matchesSearch([c.name, c.company_name, c.phone, c.email], q ?? '')
  )
  const hasActiveFilters = Boolean(q)

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Customers</h1>
          <p className="mt-1 text-sm text-gray-500">
            {customers?.length ?? 0} customer{customers?.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link
          href="/customers/new"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          New customer
        </Link>
      </div>

      <ListFilterBar
        basePath="/customers"
        searchValue={q}
        searchPlaceholder="Search name, company, phone, or email…"
        showDateRange={false}
        hasActiveFilters={hasActiveFilters}
      />

      {!customers?.length ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
          {hasActiveFilters ? (
            <>
              <p className="text-sm font-medium text-gray-500">No customers match your search.</p>
              <Link href="/customers" className="mt-3 inline-block text-sm text-blue-600 hover:text-blue-700">
                Clear filters
              </Link>
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-gray-500">No customers yet.</p>
              <p className="mt-1 text-sm text-gray-400">Add your first customer to get started.</p>
              <Link
                href="/customers/new"
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
              >
                <Plus size={16} />
                New customer
              </Link>
            </>
          )}
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-left">
                  <th className="px-6 py-3 font-semibold text-gray-600">Name</th>
                  <th className="px-6 py-3 font-semibold text-gray-600">Company</th>
                  <th className="px-6 py-3 font-semibold text-gray-600">Phone</th>
                  <th className="px-6 py-3 font-semibold text-gray-600">Email</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">{c.name}</td>
                    <td className="px-6 py-4 text-gray-500">{c.company_name ?? '—'}</td>
                    <td className="px-6 py-4 text-gray-500">{c.phone ?? '—'}</td>
                    <td className="px-6 py-4 text-gray-500">{c.email ?? '—'}</td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/customers/${c.id}`}
                        className="text-blue-600 hover:text-blue-700 font-medium"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {customers.map((c) => (
              <Link
                key={c.id}
                href={`/customers/${c.id}`}
                className="flex items-center justify-between bg-white rounded-xl border border-gray-200 px-4 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 truncate">{c.name}</p>
                  {c.company_name && (
                    <p className="text-sm text-gray-500 truncate">{c.company_name}</p>
                  )}
                  <div className="mt-1.5 flex items-center gap-3 text-xs text-gray-400">
                    {c.phone && (
                      <span className="flex items-center gap-1">
                        <Phone size={12} />
                        {c.phone}
                      </span>
                    )}
                    {c.email && (
                      <span className="flex items-center gap-1 truncate">
                        <Mail size={12} />
                        {c.email}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight size={18} className="text-gray-300 shrink-0 ml-3" />
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
