import type { StatusCounts } from '@/lib/bookkeeping'

const ROWS: { key: keyof StatusCounts; label: string; color: string }[] = [
  { key: 'paid', label: 'Paid', color: '#0ca30c' },
  { key: 'partially_paid', label: 'Partially Paid', color: '#fab219' },
  { key: 'overdue', label: 'Overdue', color: '#d03b3b' },
  { key: 'sent', label: 'Sent', color: '#898781' },
  { key: 'draft', label: 'Draft', color: '#c3c2b7' },
  { key: 'cancelled', label: 'Cancelled', color: '#e1e0d9' },
]

interface Props {
  counts: StatusCounts
}

export default function InvoiceStatusBreakdown({ counts }: Props) {
  const rows = ROWS.filter((r) => counts[r.key] > 0)
  const max = Math.max(1, ...rows.map((r) => counts[r.key]))

  if (rows.length === 0) {
    return <p className="text-sm text-gray-400">No invoices yet.</p>
  }

  return (
    <div className="space-y-3">
      {rows.map((r) => {
        const count = counts[r.key]
        const pct = (count / max) * 100
        return (
          <div key={r.key}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="flex items-center gap-1.5 text-gray-700">
                <span className="inline-block h-2 w-2 rounded-sm" style={{ backgroundColor: r.color }} />
                {r.label}
              </span>
              <span className="font-medium text-gray-900">{count}</span>
            </div>
            <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: r.color }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
