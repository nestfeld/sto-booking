import type { StationSummary } from '@/lib/catalog-api'
import { CatalogCard } from './catalog-card'

type StationCardProps = {
  station: StationSummary
  index?: number
}

export function StationCard({ station, index }: StationCardProps) {
  return (
    <CatalogCard
      eyebrow="Автосервис"
      index={index ?? 0}
      title={station.name}
      description={station.address}
      metrics={[
        { label: 'Услуги', value: `${station.serviceCount} направлений` },
        { label: 'Телефон', value: station.phone ?? 'Уточняется' },
      ]}
      footer="Принимает онлайн-записи"
      variant="station"
    />
  )
}
