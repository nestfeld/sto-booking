import type { ServiceSummary } from '@/lib/catalog-api'
import { CatalogCard } from './catalog-card'
import { ServiceIcon } from './service-icon'

type ServiceCardProps = {
  service: ServiceSummary
  index?: number
}

const priceFormatter = new Intl.NumberFormat('ru-RU')

export function ServiceCard({ service, index }: ServiceCardProps) {
  return (
    <CatalogCard
      eyebrow={service.category}
      icon={<ServiceIcon slug={service.slug} />}
      index={index ?? 0}
      title={service.name}
      description={service.description}
      metrics={[
        { label: 'Время', value: `от ${service.durationMinutes} мин` },
        {
          label: 'Стоимость',
          value: `от ${priceFormatter.format(service.priceFrom)} ₸`,
        },
      ]}
      footer={`Доступно в ${service.stationCount} СТО`}
    />
  )
}
