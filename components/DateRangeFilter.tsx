import Link from 'next/link'
import type { RangePreset } from '@/lib/bookkeeping'

const PRESETS: { value: Exclude<RangePreset, 'custom'>; label: string }[] = [
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'last_3_months', label: 'Last 3 Months' },
  { value: 'ytd', label: 'Year to Date' },
  { value: 'all_time', label: 'All Time' },
]

interface Props {
  basePath: string
  preset: RangePreset
  from: string | null
  to: string
}

export default function DateRangeFilter({ basePath, preset, from, to }: Props) {
  return (
    <div className="mb-6 flex flex-wrap items-center gap-2">
      {PRESETS.map((p) => {
        const active = preset === p.value
        return (
          <Link
            key={p.value}
            href={`${basePath}?range=${p.value}`}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              active ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {p.label}
          </Link>
        )
      })}

      <form action={basePath} method="get" className="flex items-center gap-2">
        <input type="hidden" name="range" value="custom" />
        <input
          type="date"
          name="from"
          defaultValue={preset === 'custom' ? from ?? '' : ''}
          className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm text-gray-700"
        />
        <span className="text-sm text-gray-400">to</span>
        <input
          type="date"
          name="to"
          defaultValue={preset === 'custom' ? to : ''}
          className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm text-gray-700"
        />
        <button
          type="submit"
          className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
            preset === 'custom' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          Custom
        </button>
      </form>
    </div>
  )
}
