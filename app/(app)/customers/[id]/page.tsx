import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Pencil, Phone, Mail, MapPin, Building2, User } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency, formatDate } from '@/lib/format'
import { statusLabel, statusBadgeCls } from '../../estimates/statusStyles'
import {
  statusLabel as invoiceStatusLabel,
  statusBadgeCls as invoiceStatusBadgeCls,
  displayStatus as invoiceDisplayStatus,
} from '../../invoices/statusStyles'
import { deleteCustomer } from '../actions'
import DeleteButton from './DeleteButton'

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div>
      <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</dt>
      <dd className="mt-0.5 text-sm text-gray-900 whitespace-pre-line">{value}</dd>
    </div>
  )
}

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: customer } = await supabase
    .from('customers')
    .select('*')
    .eq('id', id)
    .single()

  if (!customer) notFound()

  const [{ data: estimates }, { data: invoices }] = await Promise.all([
    supabase
      .from('estimates')
      .select('id, estimate_number, revision_number, estimate_date, total, status')
      .eq('customer_id', id)
      .order('estimate_date', { ascending: false })
      .limit(5),
    supabase
      .from('invoices')
      .select('id, invoice_number, invoice_date, due_date, total, balance_due, status')
      .eq('customer_id', id)
      .order('invoice_date', { ascending: false })
      .limit(5),
  ])

  const deleteWithId = deleteCustomer.bind(null, id)

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Link href="/customers" className="hover:text-gray-700">Customers</Link>
            <span>/</span>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">{customer.name}</h1>
          {customer.company_name && (
            <p className="mt-0.5 text-sm text-gray-500">{customer.company_name}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href={`/customers/${id}/edit`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Pencil size={15} />
            Edit
          </Link>
          <DeleteButton action={deleteWithId} />
        </div>
      </div>

      {/* Quick-action chips — mobile friendly */}
      <div className="flex flex-wrap gap-2 mb-6">
        {customer.phone && (
          <a
            href={`tel:${customer.phone}`}
            className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Phone size={14} />
            {customer.phone}
          </a>
        )}
        {customer.email && (
          <a
            href={`mailto:${customer.email}`}
            className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Mail size={14} />
            {customer.email}
          </a>
        )}
      </div>

      {/* Info grid */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <InfoRow label="Contact person" value={customer.contact_person} />
          <InfoRow label="Email" value={customer.email} />
          <InfoRow label="Phone" value={customer.phone} />
          <InfoRow label="Company" value={customer.company_name} />
          <InfoRow label="Billing address" value={customer.billing_address} />
          <InfoRow label="Default job location" value={customer.job_location} />
          {customer.notes && (
            <div className="sm:col-span-2">
              <InfoRow label="Notes" value={customer.notes} />
            </div>
          )}
          {!customer.contact_person && !customer.billing_address && !customer.job_location && !customer.notes && (
            <p className="sm:col-span-2 text-sm text-gray-400">No additional details recorded.</p>
          )}
        </dl>
      </div>

      {/* Estimates & Invoices */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700">Estimates</h3>
            <Link href={`/estimates?customer=${id}`} className="text-xs text-blue-600 hover:text-blue-700">
              View all
            </Link>
          </div>
          {!estimates?.length ? (
            <p className="text-sm text-gray-400">No estimates yet.</p>
          ) : (
            <div className="space-y-2">
              {estimates.map((e) => (
                <Link
                  key={e.id}
                  href={`/estimates/${e.id}`}
                  className="flex items-center justify-between rounded-lg px-2 py-1.5 -mx-2 hover:bg-gray-50 transition-colors"
                >
                  <span className="text-sm text-gray-700">
                    #{e.estimate_number}
                    {e.revision_number > 1 && (
                      <span className="ml-1 text-xs text-gray-400">Rev {e.revision_number}</span>
                    )}
                    <span className="ml-2 text-xs text-gray-400">{formatDate(e.estimate_date)}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="text-sm text-gray-700">{formatCurrency(e.total)}</span>
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${statusBadgeCls[e.status]}`}>
                      {statusLabel[e.status]}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          )}
          <Link
            href={`/estimates/new?customer=${id}`}
            className="mt-3 inline-block text-xs text-blue-600 hover:text-blue-700"
          >
            + New estimate
          </Link>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700">Invoices</h3>
            <Link href={`/invoices?customer=${id}`} className="text-xs text-blue-600 hover:text-blue-700">
              View all
            </Link>
          </div>
          {!invoices?.length ? (
            <p className="text-sm text-gray-400">No invoices yet.</p>
          ) : (
            <div className="space-y-2">
              {invoices.map((inv) => {
                const status = invoiceDisplayStatus(inv.status, inv.due_date)
                return (
                  <Link
                    key={inv.id}
                    href={`/invoices/${inv.id}`}
                    className="flex items-center justify-between rounded-lg px-2 py-1.5 -mx-2 hover:bg-gray-50 transition-colors"
                  >
                    <span className="text-sm text-gray-700">
                      #{inv.invoice_number}
                      <span className="ml-2 text-xs text-gray-400">{formatDate(inv.invoice_date)}</span>
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="text-sm text-gray-700">{formatCurrency(inv.balance_due)} due</span>
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${invoiceStatusBadgeCls[status]}`}>
                        {invoiceStatusLabel[status]}
                      </span>
                    </span>
                  </Link>
                )
              })}
            </div>
          )}
          <Link
            href={`/invoices/new?customer=${id}`}
            className="mt-3 inline-block text-xs text-blue-600 hover:text-blue-700"
          >
            + New invoice
          </Link>
        </div>
      </div>
    </div>
  )
}
