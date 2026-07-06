'use client'

import { useActionState } from 'react'
import { syncNow, type SyncState } from './actions'

export default function SyncButton() {
  const [state, formAction, isPending] = useActionState<SyncState, FormData>(syncNow, null)

  return (
    <form action={formAction} className="flex items-center gap-3">
      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {isPending ? 'Syncing…' : 'Sync Now'}
      </button>
      {state?.success && (
        <span className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          Workbook synced.
        </span>
      )}
      {state?.error && (
        <span className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {state.error}
        </span>
      )}
    </form>
  )
}
