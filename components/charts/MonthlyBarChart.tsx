'use client'

import { useState } from 'react'
import { formatCompactCurrency, formatCurrency } from '@/lib/format'

const COLOR_INCOME = '#2a78d6'
const COLOR_EXPENSES = '#1baf7a'
const COLOR_GRID = '#e1e0d9'
const COLOR_AXIS = '#c3c2b7'
const COLOR_MUTED = '#898781'

interface DataPoint {
  monthKey: string
  monthLabel: string
  income: number
  expenses: number
}

interface Props {
  data: DataPoint[]
}

const W = 640
const H = 220
const PAD_LEFT = 52
const PAD_BOTTOM = 24
const PAD_TOP = 12
const PAD_RIGHT = 8

function niceMax(value: number): number {
  if (value <= 0) return 100
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)))
  const normalized = value / magnitude
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10
  return step * magnitude
}

export default function MonthlyBarChart({ data }: Props) {
  const [hover, setHover] = useState<{ index: number; series: 'income' | 'expenses' } | null>(null)

  const maxVal = niceMax(Math.max(1, ...data.map((d) => Math.max(d.income, d.expenses))))
  const plotW = W - PAD_LEFT - PAD_RIGHT
  const plotH = H - PAD_TOP - PAD_BOTTOM

  const yFor = (v: number) => PAD_TOP + plotH - (v / maxVal) * plotH

  const groupW = plotW / data.length
  const barW = Math.min(24, groupW / 2 - 4)
  const gap = 2

  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * maxVal)

  const hoveredPoint = hover ? data[hover.index] : null

  return (
    <div>
      <div className="flex items-center gap-4 mb-2 text-xs text-gray-600">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: COLOR_INCOME }} />
          Income
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: COLOR_EXPENSES }} />
          Expenses
        </span>
      </div>

      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Monthly income vs expenses">
          {ticks.map((t, i) => (
            <g key={i}>
              <line
                x1={PAD_LEFT}
                x2={W - PAD_RIGHT}
                y1={yFor(t)}
                y2={yFor(t)}
                stroke={i === 0 ? COLOR_AXIS : COLOR_GRID}
                strokeWidth={1}
              />
              <text x={PAD_LEFT - 8} y={yFor(t) + 3} textAnchor="end" fontSize={9} fill={COLOR_MUTED}>
                {formatCompactCurrency(t)}
              </text>
            </g>
          ))}

          {data.map((d, i) => {
            const groupX = PAD_LEFT + i * groupW
            const incomeX = groupX + groupW / 2 - barW - gap / 2
            const expensesX = groupX + groupW / 2 + gap / 2
            const incomeH = (d.income / maxVal) * plotH
            const expensesH = (d.expenses / maxVal) * plotH
            const incomeHover = hover?.index === i && hover.series === 'income'
            const expensesHover = hover?.index === i && hover.series === 'expenses'

            return (
              <g key={d.monthKey}>
                <rect
                  x={incomeX}
                  y={PAD_TOP + plotH - incomeH}
                  width={barW}
                  height={Math.max(0, incomeH)}
                  rx={4}
                  fill={COLOR_INCOME}
                  opacity={incomeHover ? 0.85 : 1}
                />
                <rect
                  x={expensesX}
                  y={PAD_TOP + plotH - expensesH}
                  width={barW}
                  height={Math.max(0, expensesH)}
                  rx={4}
                  fill={COLOR_EXPENSES}
                  opacity={expensesHover ? 0.85 : 1}
                />

                {/* Hit targets — bigger than the visible bars, cover the whole group column */}
                <rect
                  x={groupX}
                  y={PAD_TOP}
                  width={groupW / 2}
                  height={plotH}
                  fill="transparent"
                  tabIndex={0}
                  role="button"
                  aria-label={`${d.monthLabel} income ${formatCurrency(d.income)}`}
                  onMouseEnter={() => setHover({ index: i, series: 'income' })}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover({ index: i, series: 'income' })}
                  onBlur={() => setHover(null)}
                />
                <rect
                  x={groupX + groupW / 2}
                  y={PAD_TOP}
                  width={groupW / 2}
                  height={plotH}
                  fill="transparent"
                  tabIndex={0}
                  role="button"
                  aria-label={`${d.monthLabel} expenses ${formatCurrency(d.expenses)}`}
                  onMouseEnter={() => setHover({ index: i, series: 'expenses' })}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover({ index: i, series: 'expenses' })}
                  onBlur={() => setHover(null)}
                />

                <text
                  x={groupX + groupW / 2}
                  y={H - 6}
                  textAnchor="middle"
                  fontSize={9}
                  fill={COLOR_MUTED}
                >
                  {d.monthLabel}
                </text>
              </g>
            )
          })}
        </svg>

        {hoveredPoint && (
          <div
            className="pointer-events-none absolute top-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-md"
            style={{
              left: `${((hover!.index + 0.5) / data.length) * 100}%`,
              transform: 'translateX(-50%)',
            }}
          >
            <p className="font-medium text-gray-900 mb-1">{hoveredPoint.monthLabel}</p>
            <p className="flex items-center gap-1.5 text-gray-600">
              <span className="inline-block h-2 w-2 rounded-sm" style={{ backgroundColor: COLOR_INCOME }} />
              Income <span className="font-medium text-gray-900">{formatCurrency(hoveredPoint.income)}</span>
            </p>
            <p className="flex items-center gap-1.5 text-gray-600">
              <span className="inline-block h-2 w-2 rounded-sm" style={{ backgroundColor: COLOR_EXPENSES }} />
              Expenses <span className="font-medium text-gray-900">{formatCurrency(hoveredPoint.expenses)}</span>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
