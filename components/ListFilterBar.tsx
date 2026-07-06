import Link from 'next/link'

interface Props {
  basePath: string
  searchValue?: string
  searchPlaceholder: string
  dateFrom?: string
  dateTo?: string
  showDateRange?: boolean
  hasActiveFilters: boolean
  children?: React.ReactNode
}

// Shared "search box + optional selects + date range" bar for list views.
// A single GET form so every field (search text, page-specific <select>s
// passed as children, and the date range) submits together in one request.
export default function ListFilterBar({
  basePath,
  searchValue,
  searchPlaceholder,
  dateFrom,
  dateTo,
  showDateRange = true,
  hasActiveFilters,
  children,
}: Props) {
  return (
    <form method="get" className="mb-4 flex flex-wrap items-center gap-3">
      <input
        type="search"
        name="q"
        defaultValue={searchValue ?? ''}
        placeholder={searchPlaceholder}
        className="w-full sm:w-64 sm:flex-none rounded-lg border border-gray-300 px-3 py-2.5 sm:py-1.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />

      {children}

      {showDateRange && (
        <div className="flex w-full sm:w-auto items-center gap-2">
          <input
            type="date"
            name="from"
            defaultValue={dateFrom ?? ''}
            aria-label="From date"
            className="min-w-0 flex-1 sm:flex-none rounded-lg border border-gray-300 px-2.5 py-2.5 sm:py-1.5 text-sm text-gray-700"
          />
          <span className="text-sm text-gray-400 shrink-0">to</span>
          <input
            type="date"
            name="to"
            defaultValue={dateTo ?? ''}
            aria-label="To date"
            className="min-w-0 flex-1 sm:flex-none rounded-lg border border-gray-300 px-2.5 py-2.5 sm:py-1.5 text-sm text-gray-700"
          />
        </div>
      )}

      <button
        type="submit"
        className="w-full sm:w-auto rounded-lg border border-gray-300 bg-white px-3 py-2.5 sm:py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
      >
        Filter
      </button>
      {hasActiveFilters && (
        <Link href={basePath} className="text-sm text-gray-500 hover:text-gray-700">
          Clear filters
        </Link>
      )}
    </form>
  )
}
