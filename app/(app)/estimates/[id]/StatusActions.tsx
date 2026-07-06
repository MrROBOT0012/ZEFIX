'use client'

import { useTransition } from 'react'
import { updateEstimateStatus, createEstimateRevision, convertEstimateToInvoice } from '../actions'
import type { EstimateStatus } from '@/types/database'

interface Props {
  estimateId: string
  status: EstimateStatus
}

function ActionButton({
  label,
  onClick,
  variant = 'secondary',
  disabled,
  title,
}: {
  label: string
  onClick?: () => void
  variant?: 'secondary' | 'primary' | 'danger'
  disabled?: boolean
  title?: string
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
      title={title}
      disabled={disabled || isPending}
      onClick={() => onClick && startTransition(onClick)}
      className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variantCls}`}
    >
      {isPending ? '…' : label}
    </button>
  )
}

export default function StatusActions({ estimateId, status }: Props) {
  const setStatus = (s: EstimateStatus) => updateEstimateStatus(estimateId, s)

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === 'draft' && (
        <ActionButton label="Mark as Sent" variant="primary" onClick={() => setStatus('sent')} />
      )}

      {status === 'sent' && (
        <>
          <ActionButton label="Mark as Approved" variant="primary" onClick={() => setStatus('approved')} />
          <ActionButton label="Mark as Rejected" variant="danger" onClick={() => setStatus('rejected')} />
          <ActionButton label="Mark as Expired" onClick={() => setStatus('expired')} />
        </>
      )}

      {status === 'approved' && (
        <>
          <ActionButton
            label="Convert to Invoice"
            variant="primary"
            onClick={() => convertEstimateToInvoice(estimateId)}
          />
          <ActionButton label="Mark as Expired" onClick={() => setStatus('expired')} />
        </>
      )}

      {(status === 'sent' || status === 'approved' || status === 'rejected' || status === 'expired') && (
        <ActionButton
          label="New Revision"
          variant={status === 'rejected' || status === 'expired' ? 'primary' : 'secondary'}
          onClick={() => createEstimateRevision(estimateId)}
        />
      )}
    </div>
  )
}
