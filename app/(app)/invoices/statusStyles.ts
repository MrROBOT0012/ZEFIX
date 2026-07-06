import type { InvoiceStatus } from '@/types/database'

export const statusLabel: Record<InvoiceStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  partially_paid: 'Partially Paid',
  paid: 'Paid',
  overdue: 'Overdue',
  cancelled: 'Cancelled',
}

export const statusBadgeCls: Record<InvoiceStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  sent: 'bg-blue-100 text-blue-700',
  partially_paid: 'bg-amber-100 text-amber-700',
  paid: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-200 text-gray-500',
}

// status is only auto-transitioned to partially_paid/paid via the payments
// trigger (Phase 2) and to overdue is spec'd as derived, not stored — this
// computes the display-only "Overdue" override for sent/partially_paid
// invoices whose due date has passed, without touching the stored status.
export function displayStatus(status: InvoiceStatus, dueDate: string | null): InvoiceStatus {
  if ((status === 'sent' || status === 'partially_paid') && dueDate) {
    const today = new Date().toISOString().slice(0, 10)
    if (dueDate < today) return 'overdue'
  }
  return status
}
