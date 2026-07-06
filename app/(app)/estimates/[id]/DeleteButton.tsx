'use client'

interface Props {
  action: () => Promise<void>
}

export default function DeleteButton({ action }: Props) {
  return (
    <form action={action}>
      <button
        type="submit"
        onClick={(e) => {
          if (!confirm('Delete this estimate? This cannot be undone.')) {
            e.preventDefault()
          }
        }}
        className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
      >
        Delete
      </button>
    </form>
  )
}
