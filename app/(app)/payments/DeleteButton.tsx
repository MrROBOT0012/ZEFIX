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
          if (!confirm('Delete this payment? This also removes its receipt and updates the invoice balance.')) {
            e.preventDefault()
          }
        }}
        className="text-sm font-medium text-red-600 hover:text-red-700"
      >
        Delete
      </button>
    </form>
  )
}
