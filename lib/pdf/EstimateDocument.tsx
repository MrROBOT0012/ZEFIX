import { Document, Page, View, Text, StyleSheet, Image } from '@react-pdf/renderer'
import type { Company, Estimate, EstimateLineItem } from '@/types/database'

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
  notesSection: { marginTop: 24 },
  notesTitle: { fontSize: 9, fontWeight: 700, marginBottom: 3, color: '#374151' },
  notesText: { fontSize: 9, color: '#4b5563', lineHeight: 1.4 },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
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

interface Props {
  company: Company
  estimate: Estimate
  customer: { name: string; company_name: string | null; billing_address: string | null } | null
  lineItems: EstimateLineItem[]
  draft?: boolean
}

export default function EstimateDocument({ company, estimate, customer, lineItems, draft }: Props) {
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
          <Text style={styles.title}>ESTIMATE</Text>
          <View style={styles.metaBlock}>
            <Text>
              {draft ? 'DRAFT' : `#${estimate.estimate_number}`}
              {estimate.revision_number > 1 ? ` (Rev ${estimate.revision_number})` : ''}
            </Text>
            <Text>Date: {formatDate(estimate.estimate_date)}</Text>
            {estimate.expiration_date && <Text>Expires: {formatDate(estimate.expiration_date)}</Text>}
          </View>
        </View>

        <View style={styles.partiesRow}>
          <View style={styles.partyBlock}>
            <Text style={styles.label}>Prepared For</Text>
            <Text style={styles.value}>{customer?.name ?? '—'}</Text>
            {customer?.company_name && <Text style={styles.value}>{customer.company_name}</Text>}
            {customer?.billing_address && <Text style={styles.value}>{customer.billing_address}</Text>}
          </View>
          <View style={styles.partyBlock}>
            <Text style={styles.label}>Job Location</Text>
            <Text style={styles.value}>{estimate.job_location ?? '—'}</Text>
            {estimate.job_name && (
              <>
                <Text style={styles.label}>Job</Text>
                <Text style={styles.value}>{estimate.job_name}</Text>
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
            <Text>{formatMoney(estimate.subtotal)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Discount</Text>
            <Text>-{formatMoney(estimate.discount)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Tax ({(estimate.tax_rate * 100).toFixed(2)}%)</Text>
            <Text>{formatMoney(estimate.tax_amount)}</Text>
          </View>
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalText}>Total</Text>
            <Text style={styles.grandTotalText}>{formatMoney(estimate.total)}</Text>
          </View>
        </View>

        {(estimate.notes || estimate.terms) && (
          <View style={styles.notesSection}>
            {estimate.notes && (
              <View style={{ marginBottom: 10 }}>
                <Text style={styles.notesTitle}>Notes</Text>
                <Text style={styles.notesText}>{estimate.notes}</Text>
              </View>
            )}
            {estimate.terms && (
              <View>
                <Text style={styles.notesTitle}>Terms</Text>
                <Text style={styles.notesText}>{estimate.terms}</Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.footer} fixed>
          <Text>{company.legal_name}{company.phone ? ` · ${company.phone}` : ''}</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}
