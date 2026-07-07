import { NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { getCompany } from '@/lib/company'
import { parseLineItems, computeTotals, round2 } from '@/lib/documentTotals'
import EstimateDocument from '@/lib/pdf/EstimateDocument'
import type { Estimate, EstimateLineItem } from '@/types/database'

export const runtime = 'nodejs'

interface PreviewBody {
  customer: { name: string; company_name: string | null; billing_address: string | null } | null
  estimate_date?: string
  expiration_date?: string | null
  job_location?: string | null
  job_name?: string | null
  equipment_info?: string | null
  description_of_work?: string | null
  notes?: string | null
  terms?: string | null
  discount?: number
  tax_rate?: number
  revision_number?: number
  line_items?: string
}

// Renders a PDF from the estimate form's current, unsaved values — no DB
// read or write. Numbers are only assigned on real save (spec §6), so this
// always renders with "DRAFT" in place of the estimate number.
export async function POST(request: Request) {
  const body = (await request.json()) as PreviewBody
  const company = await getCompany()

  const lineItems = parseLineItems(body.line_items ?? '[]')
  const discount = Number(body.discount) || 0
  const tax_rate = Number(body.tax_rate) || 0
  const { subtotal, tax_amount, total } = computeTotals(lineItems, discount, tax_rate)

  const now = new Date().toISOString()
  const estimate: Estimate = {
    id: 'preview',
    company_id: company.id,
    customer_id: null,
    job_id: null,
    estimate_number: 0,
    revision_number: body.revision_number ?? 1,
    parent_estimate_id: null,
    estimate_date: body.estimate_date || now.slice(0, 10),
    expiration_date: body.expiration_date || null,
    job_location: body.job_location || null,
    job_name: body.job_name || null,
    equipment_info: body.equipment_info || null,
    description_of_work: body.description_of_work || null,
    subtotal,
    discount,
    tax_rate,
    tax_amount,
    total,
    notes: body.notes || null,
    terms: body.terms || null,
    status: 'draft',
    converted_invoice_id: null,
    created_at: now,
    updated_at: now,
  }

  const lineItemRows: EstimateLineItem[] = lineItems.map((li, i) => ({
    id: `preview-${i}`,
    estimate_id: 'preview',
    description: li.description,
    quantity: li.quantity,
    unit_price: li.unit_price,
    line_total: round2(li.quantity * li.unit_price),
    sort_order: i,
  }))

  const buffer = await renderToBuffer(
    <EstimateDocument
      company={company}
      estimate={estimate}
      customer={body.customer ?? null}
      lineItems={lineItemRows}
      draft
    />
  )

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="Estimate_DRAFT_Preview.pdf"',
    },
  })
}
