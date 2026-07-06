'use client'

import { useTransition } from 'react'
import { updateInvoiceStatus } from '../actions'
import type { InvoiceStatus } from '@/types/database'

interface Props {
  invoiceId: string
  status: InvoiceStatus
}

function ActionButton({
  label,
  onClick,
  variant = 'secondary',
}: {
  label: string
  onClick: () => void
  variant?: 'secondary' | 'primary' | 'danger'
}) {
  const [isPending, startTransition] = useTransition()
  const variantCls = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 border-transparent',
    secondary: 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300',
    danger: 'bg-white text-red-600 hover:bg-red-50 border-red-200',
  }[variant]

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(onClick)}
      className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variantCls}`}
    >
      {isPending ? '…' : label}
    </button>
  )
}

export default function StatusActions({ invoiceId, status }: Props) {
  const setStatus = (s: InvoiceStatus) => updateInvoiceStatus(invoiceId, s)

  if (status === 'paid' || status === 'cancelled') return null

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === 'draft' && (
        <ActionButton label="Mark as Sent" variant="primary" onClick={() => setStatus('sent')} />
      )}
      <ActionButton label="Cancel Invoice" variant="danger" onClick={() => setStatus('cancelled')} />
    </div>
  )
}
