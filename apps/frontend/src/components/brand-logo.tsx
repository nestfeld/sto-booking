type BrandLogoProps = {
  compact?: boolean
}

export function BrandLogo({ compact = false }: BrandLogoProps) {
  return (
    <span
      className={`brand-logo${compact ? ' brand-logo--compact' : ''}`}
      aria-label="M1 Сервис"
    >
      <span className="brand-logo__top" aria-hidden="true">
        <span className="brand-logo__m">M</span>
        <span className="brand-logo__one">1</span>
      </span>
      <span className="brand-logo__caption" aria-hidden="true">
        Сервис
      </span>
    </span>
  )
}
