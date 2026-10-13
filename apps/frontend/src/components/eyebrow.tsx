import type { ReactNode } from 'react'

type EyebrowProps = {
  children: ReactNode
}

export function Eyebrow({ children }: EyebrowProps) {
  return (
    <p className="eyebrow">
      <span aria-hidden="true" />
      {children}
    </p>
  )
}
