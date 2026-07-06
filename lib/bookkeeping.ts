import { createClient } from '@/lib/supabase/server'
import { displayStatus } from '@/app/(app)/invoices/statusStyles'
import type { InvoiceStatus } from '@/types/database'

type Supabase = Awaited<ReturnType<typeof createClient>>

export type RangePreset = 'this_month' | 'last_month' | 'last_3_months' | 'ytd' | 'all_time' | 'custom'

export interface ResolvedRange {
  from: string | null
  to: string
  preset: RangePreset
  label: string
}

const PRESET_LABEL: Record<RangePreset, string> = {
  this_month: 'This Month',
  last_month: 'Last Month',
  last_3_months: 'Last 3 Months',
  ytd: 'Year to Date',
  all_time: 'All Time',
  custom: 'Custom Range',
}

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export function resolveRange(params: { range?: string; from?: string; to?: string }): ResolvedRange {
  const today = new Date()
  const y = today.getFullYear()
  const m = today.getMonth()

  if (params.range === 'custom' && params.from && params.to) {
    return { from: params.from, to: params.to, preset: 'custom', label: PRESET_LABEL.custom }
  }

  const preset = (params.range as RangePreset) || 'this_month'

  switch (preset) {
    case 'last_month': {
      const from = new Date(y, m - 1, 1)
      const to = new Date(y, m, 0)
      return { from: toISODate(from), to: toISODate(to), preset, label: PRESET_LABEL[preset] }
    }
    case 'last_3_months': {
      const from = new Date(y, m - 2, 1)
      return { from: toISODate(from), to: toISODate(today), preset, label: PRESET_LABEL[preset] }
    }
    case 'ytd': {
      const from = new Date(y, 0, 1)
      return { from: toISODate(from), to: toISODate(today), preset, label: PRESET_LABEL[preset] }
    }
    case 'all_time':
      return { from: null, to: toISODate(today), preset, label: PRESET_LABEL[preset] }
    case 'this_month':
    default: {
      const from = new Date(y, m, 1)
      return { from: toISODate(from), to: toISODate(today), preset: 'this_month', label: PRESET_LABEL.this_month }
    }
  }
}

export function getPreviousRange(resolved: ResolvedRange): { from: string | null; to: string } | null {
  if (resolved.preset === 'all_time' || !resolved.from) return null

  const from = new Date(resolved.from)
  const to = new Date(resolved.to)
  const spanMs = to.getTime() - from.getTime()
  const prevTo = new Date(from.getTime() - 24 * 60 * 60 * 1000)
  const prevFrom = new Date(prevTo.getTime() - spanMs)

  return { from: toISODate(prevFrom), to: toISODate(prevTo) }
}

async function getCompanyInvoiceIds(supabase: Supabase, companyId: string): Promise<string[]> {
  const { data } = await supabase.from('invoices').select('id').eq('company_id', companyId)
  return (data ?? []).map((i) => i.id)
}

export interface PeriodSummary {
  income: number
  expenses: number
  profit: number
}

export async function getPeriodSummary(
  supabase: Supabase,
  companyId: string,
  from: string | null,
  to: string
): Promise<PeriodSummary> {
  const invoiceIds = await getCompanyInvoiceIds(supabase, companyId)

  let paymentsQuery = supabase
    .from('payments')
    .select('amount')
    .in('invoice_id', invoiceIds.length ? invoiceIds : ['00000000-0000-0000-0000-000000000000'])
    .lte('payment_date', to)
  if (from) paymentsQuery = paymentsQuery.gte('payment_date', from)

  let expensesQuery = supabase.from('expenses').select('amount').eq('company_id', companyId).lte('expense_date', to)
  if (from) expensesQuery = expensesQuery.gte('expense_date', from)

  const [{ data: payments }, { data: expenses }] = await Promise.all([paymentsQuery, expensesQuery])

  const income = (payments ?? []).reduce((sum, p) => sum + p.amount, 0)
  const expenseTotal = (expenses ?? []).reduce((sum, e) => sum + e.amount, 0)

  return { income, expenses: expenseTotal, profit: income - expenseTotal }
}

export async function getAccountsReceivable(supabase: Supabase, companyId: string): Promise<number> {
  const { data } = await supabase
    .from('invoices')
    .select('balance_due')
    .eq('company_id', companyId)
    .neq('status', 'cancelled')

  return (data ?? []).reduce((sum, inv) => sum + inv.balance_due, 0)
}

export async function getOwnerContributions(supabase: Supabase, companyId: string): Promise<number> {
  const { data } = await supabase
    .from('expenses')
    .select('amount')
    .eq('company_id', companyId)
    .eq('is_owner_funded', true)

  return (data ?? []).reduce((sum, e) => sum + e.amount, 0)
}

export type StatusCounts = Record<InvoiceStatus, number>

export async function getInvoiceStatusCounts(supabase: Supabase, companyId: string): Promise<StatusCounts> {
  const { data } = await supabase.from('invoices').select('status, due_date').eq('company_id', companyId)

  const counts: StatusCounts = { draft: 0, sent: 0, partially_paid: 0, paid: 0, overdue: 0, cancelled: 0 }
  for (const inv of data ?? []) {
    const status = displayStatus(inv.status, inv.due_date)
    counts[status] += 1
  }
  return counts
}

export interface MonthlyRollupEntry {
  monthKey: string
  monthLabel: string
  income: number
  expenses: number
  profit: number
}

export async function getMonthlyRollup(
  supabase: Supabase,
  companyId: string,
  months: number
): Promise<MonthlyRollupEntry[]> {
  const today = new Date()
  const start = new Date(today.getFullYear(), today.getMonth() - (months - 1), 1)
  const startISO = toISODate(start)

  const invoiceIds = await getCompanyInvoiceIds(supabase, companyId)

  const [{ data: payments }, { data: expenses }] = await Promise.all([
    supabase
      .from('payments')
      .select('amount, payment_date')
      .in('invoice_id', invoiceIds.length ? invoiceIds : ['00000000-0000-0000-0000-000000000000'])
      .gte('payment_date', startISO),
    supabase.from('expenses').select('amount, expense_date').eq('company_id', companyId).gte('expense_date', startISO),
  ])

  const entries: MonthlyRollupEntry[] = []
  for (let i = 0; i < months; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() - (months - 1) + i, 1)
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const monthLabel = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
    entries.push({ monthKey, monthLabel, income: 0, expenses: 0, profit: 0 })
  }

  const byKey = new Map(entries.map((e) => [e.monthKey, e]))

  for (const p of payments ?? []) {
    const key = p.payment_date.slice(0, 7)
    const entry = byKey.get(key)
    if (entry) entry.income += p.amount
  }
  for (const e of expenses ?? []) {
    const key = e.expense_date.slice(0, 7)
    const entry = byKey.get(key)
    if (entry) entry.expenses += e.amount
  }
  for (const entry of entries) {
    entry.profit = entry.income - entry.expenses
  }

  return entries
}
