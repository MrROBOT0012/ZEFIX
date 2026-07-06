import type { PaymentMethod } from '@/types/database'

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
})

export function formatCurrency(amount: number): string {
  return currencyFormatter.format(amount)
}

const compactCurrencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 1,
})

export function formatCompactCurrency(amount: number): string {
  return compactCurrencyFormatter.format(amount)
}

const paymentMethodLabel: Record<PaymentMethod, string> = {
  cash: 'Cash',
  check: 'Check',
  ach: 'ACH',
  wire: 'Wire',
  zelle: 'Zelle',
  credit_card: 'Credit Card',
  debit_card: 'Debit Card',
  other: 'Other',
}

export function formatPaymentMethod(method: PaymentMethod): string {
  return paymentMethodLabel[method]
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return '—'
  const [year, month, day] = date.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}
