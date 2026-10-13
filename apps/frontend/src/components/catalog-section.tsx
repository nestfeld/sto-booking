import type { ReactNode } from 'react'
import { SectionHeading } from './section-heading'

type CatalogSectionProps = {
  children: ReactNode
  eyebrow: string
  title: string
  titleId: string
  href: string
  linkLabel: string
}

export function CatalogSection({
  children,
  eyebrow,
  title,
  titleId,
  href,
  linkLabel,
}: CatalogSectionProps) {
  return (
    <section className="home-catalog" aria-labelledby={titleId}>
      <SectionHeading
        eyebrow={eyebrow}
        title={title}
        titleId={titleId}
        href={href}
        linkLabel={linkLabel}
      />
      {children}
    </section>
  )
}
