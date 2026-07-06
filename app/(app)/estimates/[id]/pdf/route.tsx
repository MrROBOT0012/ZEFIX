import { NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { createClient } from '@/lib/supabase/server'
import { getCompany } from '@/lib/company'
import EstimateDocument from '@/lib/pdf/EstimateDocument'

export const runtime = 'nodejs'

function sanitize(part: string): string {
  return part.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'Unknown'
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: estimate } = await supabase.from('estimates').select('*').eq('id', id).single()
  if (!estimate) return NextResponse.json({ error: 'Estimate not found' }, { status: 404 })

  const [{ data: lineItems }, { data: customer }, company] = await Promise.all([
    supabase.from('estimate_line_items').select('*').eq('estimate_id', id).order('sort_order'),
    estimate.customer_id
      ? supabase
          .from('customers')
          .select('name, company_name, billing_address')
          .eq('id', estimate.customer_id)
          .single()
      : Promise.resolve({ data: null }),
    getCompany(),
  ])

  const buffer = await renderToBuffer(
    <EstimateDocument
      company={company}
      estimate={estimate}
      customer={customer}
      lineItems={lineItems ?? []}
    />
  )

  const filename = `Estimate_${estimate.estimate_number}_${sanitize(customer?.name ?? 'Customer')}_${estimate.estimate_date}.pdf`

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
