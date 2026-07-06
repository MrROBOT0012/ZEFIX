import { Download, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getCompanyId } from '@/lib/company'
import { formatDate } from '@/lib/format'
import SyncButton from './SyncButton'

export default async function ExcelPage() {
  const supabase = await createClient()
  const companyId = await getCompanyId()

  const { data: files } = await supabase.storage.from('workbooks').list(companyId, { search: 'workbook.xlsx' })
  const workbookFile = files?.find((f) => f.name === 'workbook.xlsx')

  let downloadUrl: string | null = null
  if (workbookFile) {
    const { data: signed } = await supabase.storage
      .from('workbooks')
      .createSignedUrl(`${companyId}/workbook.xlsx`, 300)
    downloadUrl = signed?.signedUrl ?? null
  }

  const lastSynced = workbookFile?.updated_at ?? null

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Excel Workbook</h1>
        <p className="mt-1 text-sm text-gray-500">
          A synced mirror of your Customers, Estimates, Invoices, Payments, Receipts, Expenses,
          Bookkeeping Summary, and Settings — kept current automatically as you work.
        </p>
      </div>

      <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 mb-6">
        <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
        <p className="text-sm text-amber-800">
          This workbook is a <strong>read-only mirror</strong>. Any edits made directly to the
          downloaded file will be overwritten the next time the app syncs — use it for viewing,
          reporting, or your own formulas in extra columns, not as the source of truth.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <dl className="mb-5">
          <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Last Synced</dt>
          <dd className="mt-0.5 text-sm text-gray-900">
            {lastSynced ? formatDate(lastSynced.slice(0, 10)) : 'Never — click Sync Now to generate it.'}
          </dd>
        </dl>

        <div className="flex flex-wrap items-center gap-3">
          <SyncButton />
          {downloadUrl && (
            <a
              href={downloadUrl}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Download size={15} />
              Download workbook
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
