'use client'

import { useActionState } from 'react'
import { syncNow, type SyncState } from './actions'

export default function SyncButton() {
  const [state, formAction, isPending] = useActionState<SyncState, FormData>(syncNow, null)

  return (
    <div>
      <form action={formAction} className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {isPending ? 'Generating…' : 'Generate Excel File'}
        </button>
        {state?.success && (
          <span className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
            File generated.
          </span>
        )}
        {state?.error && (
          <span className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {state.error}
          </span>
        )}
      </form>
      {state?.error && (
        <p className="mt-2 text-sm text-gray-500">
          Something went wrong while creating the file. This is usually temporary — try clicking
          &quot;Generate Excel File&quot; again, or let your developer know if it keeps happening.
        </p>
      )}
    </div>
  )
}
