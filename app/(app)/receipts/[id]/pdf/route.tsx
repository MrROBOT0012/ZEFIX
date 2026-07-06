import { NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { createClient } from '@/lib/supabase/server'
import { getCompany } from '@/lib/company'
import ReceiptDocument from '@/lib/pdf/ReceiptDocument'

export const runtime = 'nodejs'

function sanitize(part: string): string {
  return part.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'Unknown'
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: receipt } = await supabase.from('receipts').select('*').eq('id', id).single()
  if (!receipt) return NextResponse.json({ error: 'Receipt not found' }, { status: 404 })

  const [{ data: invoice }, { data: customer }, company] = await Promise.all([
    supabase.from('invoices').select('invoice_number').eq('id', receipt.invoice_id).single(),
    supabase.from('customers').select('name, company_name').eq('id', receipt.customer_id).single(),
    getCompany(),
  ])

  const buffer = await renderToBuffer(
    <ReceiptDocument
      company={company}
      receipt={receipt}
      customer={customer}
      invoiceNumber={invoice?.invoice_number ?? null}
    />
  )

  const filename = `Receipt_${receipt.receipt_number}_${sanitize(customer?.name ?? 'Customer')}_${receipt.payment_date}.pdf`

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
