'use client'

import { Plus, Copy, Trash2 } from 'lucide-react'
import { inputCls } from '@/components/ui/FormField'
import { formatCurrency } from '@/lib/format'

export type LineItemRow = {
  key: string
  description: string
  quantity: number
  unit_price: number
}

function newRow(): LineItemRow {
  return { key: crypto.randomUUID(), description: '', quantity: 1, unit_price: 0 }
}

export function emptyLineItems(): LineItemRow[] {
  return [newRow()]
}

interface Props {
  value: LineItemRow[]
  onChange: (rows: LineItemRow[]) => void
  error?: string
}

export default function LineItemsEditor({ value, onChange, error }: Props) {
  function update(key: string, patch: Partial<LineItemRow>) {
    onChange(value.map((row) => (row.key === key ? { ...row, ...patch } : row)))
  }

  function duplicate(key: string) {
    const idx = value.findIndex((row) => row.key === key)
    if (idx === -1) return
    const copy = { ...value[idx], key: crypto.randomUUID() }
    onChange([...value.slice(0, idx + 1), copy, ...value.slice(idx + 1)])
  }

  function remove(key: string) {
    onChange(value.filter((row) => row.key !== key))
  }

  function add() {
    onChange([...value, newRow()])
  }

  return (
    <div>
      {/* Desktop table */}
      <div className="hidden md:block overflow-hidden rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-left">
              <th className="px-4 py-2 font-semibold text-gray-600">Description</th>
              <th className="px-4 py-2 font-semibold text-gray-600 w-24">Qty</th>
              <th className="px-4 py-2 font-semibold text-gray-600 w-32">Unit Price</th>
              <th className="px-4 py-2 font-semibold text-gray-600 w-32 text-right">Line Total</th>
              <th className="px-4 py-2 w-20" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {value.map((row) => (
              <tr key={row.key}>
                <td className="px-4 py-2">
                  <input
                    type="text"
                    value={row.description}
                    onChange={(e) => update(row.key, { description: e.target.value })}
                    className={inputCls}
                    placeholder="Description of work or materials"
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={row.quantity}
                    onChange={(e) => update(row.key, { quantity: Number(e.target.value) || 0 })}
                    className={inputCls}
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={row.unit_price}
                    onChange={(e) => update(row.key, { unit_price: Number(e.target.value) || 0 })}
                    className={inputCls}
                  />
                </td>
                <td className="px-4 py-2 text-right text-gray-700">
                  {formatCurrency(row.quantity * row.unit_price)}
                </td>
                <td className="px-4 py-2">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => duplicate(row.key)}
                      title="Duplicate"
                      className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                    >
                      <Copy size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(row.key)}
                      title="Remove"
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {value.map((row) => (
          <div key={row.key} className="rounded-lg border border-gray-200 p-4 space-y-3">
            <input
              type="text"
              value={row.description}
              onChange={(e) => update(row.key, { description: e.target.value })}
              className={inputCls}
              placeholder="Description of work or materials"
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Qty</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={row.quantity}
                  onChange={(e) => update(row.key, { quantity: Number(e.target.value) || 0 })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Unit Price</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={row.unit_price}
                  onChange={(e) => update(row.key, { unit_price: Number(e.target.value) || 0 })}
                  className={inputCls}
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">
                {formatCurrency(row.quantity * row.unit_price)}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => duplicate(row.key)}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600"
                >
                  <Copy size={13} />
                  Duplicate
                </button>
                <button
                  type="button"
                  onClick={() => remove(row.key)}
                  className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600"
                >
                  <Trash2 size={13} />
                  Remove
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <button
        type="button"
        onClick={add}
        className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <Plus size={15} />
        Add line item
      </button>
    </div>
  )
}
