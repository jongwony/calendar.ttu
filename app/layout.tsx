import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'TTU GAENG',
  description: '근무표 → Google Calendar 동기화',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}
