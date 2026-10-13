import type { ReactNode } from 'react'
import { Eyebrow } from './eyebrow'

type CatalogPageLayoutProps = {
  children: ReactNode
  eyebrow: string
  title: string
  description: string
}

export function CatalogPageLayout({
  children,
  eyebrow,
  title,
  description,
}: CatalogPageLayoutProps) {
  return (
    <section className="catalog-page">
      <div className="catalog-page__heading">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {children}
    </section>
  )
}
