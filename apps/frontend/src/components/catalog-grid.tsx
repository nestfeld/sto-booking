import type { ReactNode } from 'react'
import { CatalogError } from './catalog-error'

type CatalogGridProps<T> = {
  items: T[] | null
  emptyMessage: string
  renderItem: (item: T, index: number) => ReactNode
  variant?: 'services' | 'stations'
}

export function CatalogGrid<T>({
  items,
  emptyMessage,
  renderItem,
  variant = 'services',
}: CatalogGridProps<T>) {
  if (items === null) {
    return <CatalogError />
  }

  if (items.length === 0) {
    return <div className="catalog-message">{emptyMessage}</div>
  }

  return (
    <div className={`catalog-grid${variant === 'stations' ? ' catalog-grid--stations' : ''}`}>
      {items.map(renderItem)}
    </div>
  )
}
