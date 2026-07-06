import { ImageResponse } from 'next/og'

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
          fontSize: 320,
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
