import { Document, Page, View, Text, StyleSheet, Image } from '@react-pdf/renderer'
import type { Company, Receipt } from '@/types/database'

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
  totalsBlock: { marginTop: 28, alignItems: 'flex-end' },
  totalsRow: { flexDirection: 'row', justifyContent: 'space-between', width: 220, marginBottom: 3 },
  totalsLabel: { color: '#4b5563' },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 220,
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  grandTotalText: { fontSize: 12, fontWeight: 700 },
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
})

function formatMoney(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

function formatDate(date: string | null) {
  if (!date) return '—'
  const [y, m, d] = date.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

const paymentMethodLabel: Record<string, string> = {
  cash: 'Cash',
  check: 'Check',
  ach: 'ACH',
  wire: 'Wire',
  zelle: 'Zelle',
  credit_card: 'Credit Card',
  debit_card: 'Debit Card',
  other: 'Other',
}

interface Props {
  company: Company
  receipt: Receipt
  customer: { name: string; company_name: string | null } | null
  invoiceNumber: number | null
}

export default function ReceiptDocument({ company, receipt, customer, invoiceNumber }: Props) {
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
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
          <Text style={styles.title}>PAYMENT RECEIPT</Text>
          <View style={styles.metaBlock}>
            <Text>#{receipt.receipt_number}</Text>
            <Text>Date: {formatDate(receipt.payment_date)}</Text>
          </View>
        </View>

        <View style={styles.partiesRow}>
          <View style={styles.partyBlock}>
            <Text style={styles.label}>Received From</Text>
            <Text style={styles.value}>{customer?.name ?? '—'}</Text>
            {customer?.company_name && <Text style={styles.value}>{customer.company_name}</Text>}
          </View>
          <View style={styles.partyBlock}>
            <Text style={styles.label}>Applied To</Text>
            <Text style={styles.value}>{invoiceNumber ? `Invoice #${invoiceNumber}` : '—'}</Text>
          </View>
        </View>

        <View style={styles.totalsBlock}>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Payment Method</Text>
            <Text>{paymentMethodLabel[receipt.payment_method] ?? receipt.payment_method}</Text>
          </View>
          {receipt.reference_number && (
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Reference Number</Text>
              <Text>{receipt.reference_number}</Text>
            </View>
          )}
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalText}>Amount Received</Text>
            <Text style={styles.grandTotalText}>{formatMoney(receipt.payment_amount)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Remaining Balance</Text>
            <Text>{formatMoney(receipt.remaining_balance)}</Text>
          </View>
        </View>

        {receipt.notes && (
          <View style={styles.notesSection}>
            <Text style={styles.notesTitle}>Notes</Text>
            <Text style={styles.notesText}>{receipt.notes}</Text>
          </View>
        )}

        <View style={styles.footer} fixed>
          <Text>
            {company.legal_name}
            {company.phone ? ` · ${company.phone}` : ''}
          </Text>
        </View>
      </Page>
    </Document>
  )
}
