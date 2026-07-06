import { ImageResponse } from 'next/og'

// Maskable icons get clipped to arbitrary OS shapes (circle, squircle, etc.),
// so content must stay inside the ~80%-diameter safe zone — hence the
// smaller glyph and generous padding versus the plain 512 icon.
export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#2563eb',
          color: '#fff',
          fontSize: 200,
          fontWeight: 700,
          fontFamily: 'sans-serif',
        }}
      >
        Z
      </div>
    ),
    { width: 512, height: 512 }
  )
}
