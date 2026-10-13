import type { ReactNode } from 'react'
import { SiteFooter } from './site-footer'
import { SiteHeader } from './site-header'

type SiteLayoutProps = {
  children: ReactNode
  footerNote?: string
}

export function SiteLayout({ children, footerNote }: SiteLayoutProps) {
  return (
    <main className="site-shell">
      <SiteHeader />
      {children}
      <SiteFooter note={footerNote} />
    </main>
  )
}
