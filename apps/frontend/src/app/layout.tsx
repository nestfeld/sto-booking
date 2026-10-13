import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import './globals.css'

// Next.js expects metadata to live beside the layout component.
// oxlint-disable-next-line react/only-export-components
export const metadata: Metadata = {
  title: 'M1 Сервис',
  description: 'Онлайн-запись в сеть автосервисов M1 Сервис',
  icons: {
    icon: '/favicon.svg',
  },
}

type RootLayoutProps = Readonly<{
  children: ReactNode
}>

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="ru" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  )
}
