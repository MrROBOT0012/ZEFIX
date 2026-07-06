import { Document, Page, View, Text, StyleSheet, Image } from '@react-pdf/renderer'
import type { Company, Invoice, InvoiceLineItem } from '@/types/database'

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, color: '#1f2937', fontFamily: 'Helvetica' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  logo: { width: 120, maxHeight: 60, objectFit: 'contain' },
  companyBlock: { alignItems: 'flex-end', textAlign: 'right' },
  companyName: { fontSize: 13, fontWeight: 700 },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 24,
  },
  title: { fontSize: 18, fontWeight: 700, color: '#111827' },
  metaBlock: { alignItems: 'flex-end' },
  partiesRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  partyBlock: { width: '48%' },
  label: { fontSize: 8, color: '#6b7280', textTransform: 'uppercase', marginBottom: 2 },
  value: { fontSize: 10, marginBottom: 8 },
  table: { marginTop: 24 },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  colDescription: { width: '46%' },
  colQty: { width: '14%', textAlign: 'right' },
  colPrice: { width: '20%', textAlign: 'right' },
  colTotal: { width: '20%', textAlign: 'right' },
  headerCell: { fontSize: 9, fontWeight: 700, color: '#374151' },
  totalsBlock: { marginTop: 16, alignItems: 'flex-end' },
  totalsRow: { flexDirection: 'row', justifyContent: 'space-between', width: 200, marginBottom: 3 },
  totalsLabel: { color: '#4b5563' },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 200,
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  grandTotalText: { fontSize: 12, fontWeight: 700 },
  balanceDueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 200,
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  balanceDueText: { fontSize: 11, fontWeight: 700, color: '#b91c1c' },
  notesSection: { marginTop: 24 },
  notesTitle: { fontSize: 9, fontWeight: 700, marginBottom: 3, color: '#374151' },
  notesText: { fontSize: 9, color: '#4b5563', lineHeight: 1.4 },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 8,
    color: '#9ca3af',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 8,
  },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between' },
})

function formatMoney(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

function formatDate(date: string | null) {
  if (!date) return '—'
  const [y, m, d] = date.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

interface Props {
  company: Company
  invoice: Invoice
  customer: { name: string; company_name: string | null } | null
  lineItems: InvoiceLineItem[]
}

export default function InvoiceDocument({ company, invoice, customer, lineItems }: Props) {
  return (
    <Document>
      <Page size="LETTER" style={styles.page} wrap>
        <View style={styles.headerRow}>
          {company.logo_url ? (
            // eslint-disable-next-line jsx-a11y/alt-text
            <Image src={company.logo_url} style={styles.logo} />
          ) : (
            <View />
          )}
          <View style={styles.companyBlock}>
            <Text style={styles.companyName}>{company.legal_name}</Text>
            {company.address && <Text>{company.address}</Text>}
            {company.phone && <Text>{company.phone}</Text>}
            {company.email && <Text>{company.email}</Text>}
          </View>
        </View>

        <View style={styles.titleRow}>
          <Text style={styles.title}>INVOICE</Text>
          <View style={styles.metaBlock}>
            <Text>#{invoice.invoice_number}</Text>
            <Text>Date: {formatDate(invoice.invoice_date)}</Text>
            {invoice.due_date && <Text>Due: {formatDate(invoice.due_date)}</Text>}
            {invoice.po_number && <Text>PO#: {invoice.po_number}</Text>}
          </View>
        </View>

        <View style={styles.partiesRow}>
          <View style={styles.partyBlock}>
            <Text style={styles.label}>Bill To</Text>
            <Text style={styles.value}>{customer?.name ?? '—'}</Text>
            {customer?.company_name && <Text style={styles.value}>{customer.company_name}</Text>}
            {invoice.billing_address && <Text style={styles.value}>{invoice.billing_address}</Text>}
          </View>
          <View style={styles.partyBlock}>
            <Text style={styles.label}>Job Location</Text>
            <Text style={styles.value}>{invoice.job_location ?? '—'}</Text>
            {invoice.job_name && (
              <>
                <Text style={styles.label}>Job</Text>
                <Text style={styles.value}>{invoice.job_name}</Text>
              </>
            )}
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader} fixed>
            <Text style={[styles.headerCell, styles.colDescription]}>Description</Text>
            <Text style={[styles.headerCell, styles.colQty]}>Qty</Text>
            <Text style={[styles.headerCell, styles.colPrice]}>Unit Price</Text>
            <Text style={[styles.headerCell, styles.colTotal]}>Line Total</Text>
          </View>
          {lineItems.map((li) => (
            <View key={li.id} style={styles.tableRow} wrap={false}>
              <Text style={styles.colDescription}>{li.description}</Text>
              <Text style={styles.colQty}>{li.quantity}</Text>
              <Text style={styles.colPrice}>{formatMoney(li.unit_price)}</Text>
              <Text style={styles.colTotal}>{formatMoney(li.line_total)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totalsBlock}>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Subtotal</Text>
            <Text>{formatMoney(invoice.subtotal)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Discount</Text>
            <Text>-{formatMoney(invoice.discount)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Tax ({(invoice.tax_rate * 100).toFixed(2)}%)</Text>
            <Text>{formatMoney(invoice.tax_amount)}</Text>
          </View>
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalText}>Total</Text>
            <Text style={styles.grandTotalText}>{formatMoney(invoice.total)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Amount Paid</Text>
            <Text>{formatMoney(invoice.amount_paid)}</Text>
          </View>
          <View style={styles.balanceDueRow}>
            <Text style={styles.balanceDueText}>Balance Due</Text>
            <Text style={styles.balanceDueText}>{formatMoney(invoice.balance_due)}</Text>
          </View>
        </View>

        {(invoice.notes || invoice.payment_instructions) && (
          <View style={styles.notesSection}>
            {invoice.notes && (
              <View style={{ marginBottom: 10 }}>
                <Text style={styles.notesTitle}>Notes</Text>
                <Text style={styles.notesText}>{invoice.notes}</Text>
              </View>
            )}
            {invoice.payment_instructions && (
              <View>
                <Text style={styles.notesTitle}>Payment Instructions</Text>
                <Text style={styles.notesText}>{invoice.payment_instructions}</Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.footer} fixed>
          <View style={styles.footerRow}>
            <Text>
              {company.legal_name}
              {company.phone ? ` · ${company.phone}` : ''}
              {invoice.payment_terms ? ` · Terms: ${invoice.payment_terms}` : ''}
            </Text>
            <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
          </View>
        </View>
      </Page>
    </Document>
  )
}
