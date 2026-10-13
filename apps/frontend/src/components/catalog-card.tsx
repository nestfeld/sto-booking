import type { ReactNode } from 'react'

type CatalogCardMetric = {
  label: string
  value: ReactNode
}

type CatalogCardProps = {
  eyebrow: string
  icon?: ReactNode
  index: number
  title: string
  description: ReactNode
  metrics: [CatalogCardMetric, CatalogCardMetric]
  footer: ReactNode
  variant?: 'service' | 'station'
}

export function CatalogCard({
  eyebrow,
  icon,
  index,
  title,
  description,
  metrics,
  footer,
  variant = 'service',
}: CatalogCardProps) {
  return (
    <article
      className={`catalog-card ${variant}-card${icon ? ' catalog-card--with-icon' : ''}`}
    >
      <div className="catalog-card__topline">
        <span className="catalog-card__identity">
          {icon}
          <span>{eyebrow}</span>
        </span>
        <span className="catalog-card__index">{String(index + 1).padStart(2, '0')}</span>
      </div>
      <h2>{title}</h2>
      <p className={variant === 'station' ? 'station-card__address' : undefined}>
        {description}
      </p>
      <dl className="catalog-card__meta">
        {metrics.map((metric) => (
          <div key={metric.label}>
            <dt>{metric.label}</dt>
            <dd>{metric.value}</dd>
          </div>
        ))}
      </dl>
      <div className="catalog-card__footer">
        <span className="availability-dot" aria-hidden="true" />
        {footer}
      </div>
    </article>
  )
}
