import { NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { createClient } from '@/lib/supabase/server'
import { getCompany } from '@/lib/company'
import InvoiceDocument from '@/lib/pdf/InvoiceDocument'

export const runtime = 'nodejs'

function sanitize(part: string): string {
  return part.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'Unknown'
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: invoice } = await supabase.from('invoices').select('*').eq('id', id).single()
  if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })

  const [{ data: lineItems }, { data: customer }, company] = await Promise.all([
    supabase.from('invoice_line_items').select('*').eq('invoice_id', id).order('sort_order'),
    invoice.customer_id
      ? supabase.from('customers').select('name, company_name').eq('id', invoice.customer_id).single()
      : Promise.resolve({ data: null }),
    getCompany(),
  ])

  const buffer = await renderToBuffer(
    <InvoiceDocument
      company={company}
      invoice={invoice}
      customer={customer}
      lineItems={lineItems ?? []}
    />
  )

  const filename = `Invoice_${invoice.invoice_number}_${sanitize(customer?.name ?? 'Customer')}_${invoice.invoice_date}.pdf`

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
