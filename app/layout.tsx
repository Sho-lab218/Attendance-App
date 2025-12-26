import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Attendance App',
  description: 'Track student attendance for your classes',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

