type ServiceIconProps = {
  slug: string
}

export function ServiceIcon({ slug }: ServiceIconProps) {
  return (
    <span className="catalog-card__icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" focusable="false">
        {slug === 'computer-diagnostics' ? (
          <>
            <rect x="3" y="4" width="18" height="13" rx="2" />
            <path d="M8 21h8M12 17v4M6.5 10h2l1.5-3 3 6 1.5-3h3" />
          </>
        ) : null}

        {slug === 'scheduled-maintenance' ? (
          <>
            <path d="M12 3s6 6.35 6 11a6 6 0 0 1-12 0c0-4.65 6-11 6-11Z" />
            <path d="m9 14 2 2 4-4" />
          </>
        ) : null}

        {slug === 'suspension-repair' ? (
          <>
            <path d="M9 3h6M9 21h6M12 3v3M12 18v3" />
            <path d="m12 6-3 2 6 3-6 3 6 2-3 2" />
          </>
        ) : null}

        {slug === 'brake-service' ? (
          <>
            <circle cx="11" cy="12" r="7.5" />
            <circle cx="11" cy="12" r="2.5" />
            <path d="M16.5 7.5h2A2.5 2.5 0 0 1 21 10v4a2.5 2.5 0 0 1-2.5 2.5h-2" />
          </>
        ) : null}

        {slug === 'tire-service' ? (
          <>
            <circle cx="12" cy="12" r="8.5" />
            <circle cx="12" cy="12" r="4" />
            <path d="m8 4.5 1.5 3M14.5 16.5l1.5 3M16 4.5l-1.5 3M9.5 16.5l-1.5 3" />
          </>
        ) : null}

        {slug === 'air-conditioning' ? (
          <>
            <path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9" />
            <path d="m9.5 5.5 2.5 2 2.5-2M9.5 18.5l2.5-2 2.5 2M5 10.5l3-.5.5-3M19 13.5l-3 .5-.5 3M5 13.5l3 .5.5 3M19 10.5l-3-.5-.5-3" />
          </>
        ) : null}

        {![
          'computer-diagnostics',
          'scheduled-maintenance',
          'suspension-repair',
          'brake-service',
          'tire-service',
          'air-conditioning',
        ].includes(slug) ? (
          <>
            <path d="M14.5 6.5a4 4 0 0 0-5 5L4 17l3 3 5.5-5.5a4 4 0 0 0 5-5l-2.5 2.5-3-3L14.5 6.5Z" />
          </>
        ) : null}
      </svg>
    </span>
  )
}
