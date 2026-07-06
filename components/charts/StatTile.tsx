const TONE_COLOR: Record<'good' | 'bad' | 'neutral', string> = {
  good: '#006300',
  bad: '#d03b3b',
  neutral: '#898781',
}

interface Delta {
  text: string
  tone: 'good' | 'bad' | 'neutral'
}

interface Props {
  label: string
  value: string
  delta?: Delta
}

export default function StatTile({ label, value, delta }: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="mt-1.5 text-2xl font-semibold text-gray-900">{value}</p>
      {delta && (
        <p className="mt-1 text-xs font-medium" style={{ color: TONE_COLOR[delta.tone] }}>
          {delta.text}
        </p>
      )}
    </div>
  )
}

export function computeDelta(current: number, previous: number, goodDirection: 'up' | 'down'): Delta {
  if (previous === 0) {
    if (current === 0) return { text: 'No change vs. previous period', tone: 'neutral' }
    const tone = goodDirection === 'up' ? 'good' : 'bad'
    return { text: 'New this period vs. previous period', tone }
  }

  const pct = ((current - previous) / Math.abs(previous)) * 100
  const rounded = Math.round(pct * 10) / 10
  const direction = rounded > 0 ? 'up' : rounded < 0 ? 'down' : 'flat'
  const tone: Delta['tone'] =
    direction === 'flat' ? 'neutral' : direction === goodDirection ? 'good' : 'bad'
  const arrow = direction === 'up' ? '↑' : direction === 'down' ? '↓' : '→'

  return { text: `${arrow} ${Math.abs(rounded)}% vs. previous period`, tone }
}
