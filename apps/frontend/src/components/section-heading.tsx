import Link from 'next/link'
import { Eyebrow } from './eyebrow'

type SectionHeadingProps = {
  eyebrow: string
  title: string
  titleId?: string
  href?: string
  linkLabel?: string
}

export function SectionHeading({
  eyebrow,
  title,
  titleId,
  href,
  linkLabel,
}: SectionHeadingProps) {
  return (
    <div className="section-heading">
      <div>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h2 id={titleId}>{title}</h2>
      </div>
      {href && linkLabel ? (
        <Link href={href}>
          {linkLabel}
          <span className="section-heading__arrow" aria-hidden="true">
            →
          </span>
        </Link>
      ) : null}
    </div>
  )
}
