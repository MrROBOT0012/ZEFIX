'use client'

import { useState } from 'react'
import { formatCompactCurrency, formatCurrency } from '@/lib/format'

const COLOR_LINE = '#2a78d6'
const COLOR_GRID = '#e1e0d9'
const COLOR_AXIS = '#c3c2b7'
const COLOR_MUTED = '#898781'
const COLOR_SURFACE = '#ffffff'

interface DataPoint {
  monthKey: string
  monthLabel: string
  profit: number
}

interface Props {
  data: DataPoint[]
}

const W = 640
const H = 220
const PAD_LEFT = 56
const PAD_BOTTOM = 24
const PAD_TOP = 12
const PAD_RIGHT = 12

function niceBounds(min: number, max: number): { min: number; max: number } {
  const span = Math.max(1, max - min)
  const magnitude = Math.pow(10, Math.floor(Math.log10(span)))
  const step = Math.ceil(span / magnitude / 2) * magnitude * 2 || magnitude
  const niceMax = Math.ceil(max / step) * step
  const niceMin = min < 0 ? Math.floor(min / step) * step : 0
  return { min: niceMin, max: niceMax || step }
}

export default function ProfitLineChart({ data }: Props) {
  const [hover, setHover] = useState<number | null>(null)

  const values = data.map((d) => d.profit)
  const { min, max } = niceBounds(Math.min(0, ...values), Math.max(0, ...values))
  const plotW = W - PAD_LEFT - PAD_RIGHT
  const plotH = H - PAD_TOP - PAD_BOTTOM

  const xFor = (i: number) => (data.length <= 1 ? PAD_LEFT + plotW / 2 : PAD_LEFT + (i / (data.length - 1)) * plotW)
  const yFor = (v: number) => PAD_TOP + plotH - ((v - min) / (max - min)) * plotH

  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => min + f * (max - min))

  const linePath = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i)} ${yFor(d.profit)}`).join(' ')
  const areaPath = `${linePath} L ${xFor(data.length - 1)} ${yFor(0)} L ${xFor(0)} ${yFor(0)} Z`

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Monthly profit trend">
        {ticks.map((t, i) => (
          <g key={i}>
            <line
              x1={PAD_LEFT}
              x2={W - PAD_RIGHT}
              y1={yFor(t)}
              y2={yFor(t)}
              stroke={Math.abs(t) < 0.01 ? COLOR_AXIS : COLOR_GRID}
              strokeWidth={1}
            />
            <text x={PAD_LEFT - 8} y={yFor(t) + 3} textAnchor="end" fontSize={9} fill={COLOR_MUTED}>
              {formatCompactCurrency(t)}
            </text>
          </g>
        ))}

        <path d={areaPath} fill={COLOR_LINE} opacity={0.1} />
        <path d={linePath} fill="none" stroke={COLOR_LINE} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

        {data.map((d, i) => (
          <g key={d.monthKey}>
            <circle
              cx={xFor(i)}
              cy={yFor(d.profit)}
              r={hover === i ? 6 : 4}
              fill={COLOR_LINE}
              stroke={COLOR_SURFACE}
              strokeWidth={2}
            />
            <rect
              x={xFor(i) - plotW / data.length / 2}
              y={PAD_TOP}
              width={plotW / data.length}
              height={plotH}
              fill="transparent"
              tabIndex={0}
              role="button"
              aria-label={`${d.monthLabel} profit ${formatCurrency(d.profit)}`}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
            />
            <text x={xFor(i)} y={H - 6} textAnchor="middle" fontSize={9} fill={COLOR_MUTED}>
              {d.monthLabel}
            </text>
          </g>
        ))}
      </svg>

      {hover !== null && (
        <div
          className="pointer-events-none absolute top-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-md"
          style={{ left: `${((hover + 0.5) / data.length) * 100}%`, transform: 'translateX(-50%)' }}
        >
          <p className="font-medium text-gray-900">{data[hover].monthLabel}</p>
          <p className="text-gray-600">
            Profit <span className="font-medium text-gray-900">{formatCurrency(data[hover].profit)}</span>
          </p>
        </div>
      )}
    </div>
  )
}
