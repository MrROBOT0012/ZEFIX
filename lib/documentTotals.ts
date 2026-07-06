export type LineItemInput = {
  description: string
  quantity: number
  unit_price: number
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export function parseLineItems(raw: string): LineItemInput[] {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return []
  }
  if (!Array.isArray(parsed)) return []

  return parsed
    .map((row) => ({
      description: String((row as { description?: unknown }).description ?? '').trim(),
      quantity: Number((row as { quantity?: unknown }).quantity) || 0,
      unit_price: Number((row as { unit_price?: unknown }).unit_price) || 0,
    }))
    .filter((row) => row.description.length > 0)
}

export function computeTotals(lineItems: LineItemInput[], discount: number, taxRate: number) {
  const subtotal = round2(lineItems.reduce((sum, li) => sum + li.quantity * li.unit_price, 0))
  const taxable = Math.max(0, subtotal - discount)
  const tax_amount = round2(taxable * taxRate)
  const total = round2(taxable + tax_amount)
  return { subtotal, tax_amount, total }
}
