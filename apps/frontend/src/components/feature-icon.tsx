type FeatureIconName = 'always-open' | 'three-steps' | 'online-booking'

type FeatureIconProps = {
  name: FeatureIconName
}

export function FeatureIcon({ name }: FeatureIconProps) {
  return (
    <span className="principle-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" focusable="false">
        {name === 'always-open' ? (
          <>
            <circle cx="12" cy="12" r="8.5" />
            <path d="M12 7.5v5l3.25 2" />
          </>
        ) : null}

        {name === 'three-steps' ? (
          <>
            <circle cx="5" cy="6" r="1.75" />
            <circle cx="12" cy="12" r="1.75" />
            <circle cx="19" cy="18" r="1.75" />
            <path d="M6.75 6h1.5A3.75 3.75 0 0 1 12 9.75v.5M13.75 12h.5A4.75 4.75 0 0 1 19 16.25" />
          </>
        ) : null}

        {name === 'online-booking' ? (
          <>
            <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
            <path d="M8 3.5v3M16 3.5v3M3.5 9.5h17M8.5 14.5l2.25 2.25 4.75-4.75" />
          </>
        ) : null}
      </svg>
    </span>
  )
}
