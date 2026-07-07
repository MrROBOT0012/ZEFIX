import { NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { getCompany } from '@/lib/company'
import { parseLineItems, computeTotals, round2 } from '@/lib/documentTotals'
import InvoiceDocument from '@/lib/pdf/InvoiceDocument'
import type { Invoice, InvoiceLineItem, InvoiceType } from '@/types/database'

export const runtime = 'nodejs'

interface PreviewBody {
  customer: { name: string; company_name: string | null } | null
  invoice_type?: InvoiceType
  invoice_date?: string
  due_date?: string | null
  billing_address?: string | null
  job_location?: string | null
  job_name?: string | null
  equipment_info?: string | null
  po_number?: string | null
  description_of_work?: string | null
  payment_terms?: string | null
  payment_instructions?: string | null
  notes?: string | null
  discount?: number
  tax_rate?: number
  line_items?: string
}

// Renders a PDF from the invoice form's current, unsaved values — no DB
// read or write. Numbers are only assigned on real save (spec §6), so this
// always renders with "DRAFT" in place of the invoice number.
export async function POST(request: Request) {
  const body = (await request.json()) as PreviewBody
  const company = await getCompany()

  const lineItems = parseLineItems(body.line_items ?? '[]')
  const discount = Number(body.discount) || 0
  const tax_rate = Number(body.tax_rate) || 0
  const { subtotal, tax_amount, total } = computeTotals(lineItems, discount, tax_rate)

  const now = new Date().toISOString()
  const invoice: Invoice = {
    id: 'preview',
    company_id: company.id,
    customer_id: null,
    job_id: null,
    invoice_number: 0,
    invoice_type: body.invoice_type ?? 'standard',
    linked_final_invoice_id: null,
    invoice_date: body.invoice_date || now.slice(0, 10),
    due_date: body.due_date || null,
    billing_address: body.billing_address || null,
    job_location: body.job_location || null,
    job_name: body.job_name || null,
    equipment_info: body.equipment_info || null,
    po_number: body.po_number || null,
    description_of_work: body.description_of_work || null,
    subtotal,
    discount,
    tax_rate,
    tax_amount,
    total,
    amount_paid: 0,
    balance_due: total,
    payment_terms: body.payment_terms || null,
    payment_instructions: body.payment_instructions || null,
    notes: body.notes || null,
    status: 'draft',
    source_estimate_id: null,
    created_at: now,
    updated_at: now,
  }

  const lineItemRows: InvoiceLineItem[] = lineItems.map((li, i) => ({
    id: `preview-${i}`,
    invoice_id: 'preview',
    description: li.description,
    quantity: li.quantity,
    unit_price: li.unit_price,
    line_total: round2(li.quantity * li.unit_price),
    sort_order: i,
  }))

  const buffer = await renderToBuffer(
    <InvoiceDocument
      company={company}
      invoice={invoice}
      customer={body.customer ?? null}
      lineItems={lineItemRows}
      draft
    />
  )

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="Invoice_DRAFT_Preview.pdf"',
    },
  })
}
