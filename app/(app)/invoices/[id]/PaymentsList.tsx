'use client'

import Link from 'next/link'
import { deletePayment } from '@/app/(app)/payments/actions'
import DeleteButton from '@/app/(app)/payments/DeleteButton'
import { formatCurrency, formatDate, formatPaymentMethod } from '@/lib/format'
import type { Payment } from '@/types/database'

interface Props {
  payments: Payment[]
  receiptIdByPayment: Record<string, string>
}

export default function PaymentsList({ payments, receiptIdByPayment }: Props) {
  if (payments.length === 0) {
    return <p className="px-6 py-4 text-sm text-gray-500">No payments recorded yet.</p>
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-gray-100 bg-gray-50 text-left">
          <th className="px-6 py-2 font-semibold text-gray-600">Date</th>
          <th className="px-6 py-2 font-semibold text-gray-600 text-right">Amount</th>
          <th className="px-6 py-2 font-semibold text-gray-600">Method</th>
          <th className="px-6 py-2 font-semibold text-gray-600">Reference</th>
          <th className="px-6 py-2" />
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {payments.map((p) => {
          const receiptId = receiptIdByPayment[p.id]
          return (
            <tr key={p.id}>
              <td className="px-6 py-3 text-gray-600">{formatDate(p.payment_date)}</td>
              <td className="px-6 py-3 text-right text-gray-900">{formatCurrency(p.amount)}</td>
              <td className="px-6 py-3 text-gray-600">{formatPaymentMethod(p.payment_method)}</td>
              <td className="px-6 py-3 text-gray-500">{p.reference_number ?? '—'}</td>
              <td className="px-6 py-3 text-right">
                <div className="flex items-center justify-end gap-3">
                  {receiptId && (
                    <Link href={`/receipts/${receiptId}`} className="text-blue-600 hover:text-blue-700 font-medium">
                      Receipt
                    </Link>
                  )}
                  <DeleteButton action={deletePayment.bind(null, p.id)} />
                </div>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
