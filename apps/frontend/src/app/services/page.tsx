import type { Metadata } from 'next'
import { connection } from 'next/server'
import { CatalogGrid } from '@/components/catalog-grid'
import { CatalogPageLayout } from '@/components/catalog-page-layout'
import { ServiceCard } from '@/components/service-card'
import { SiteLayout } from '@/components/site-layout'
import { getServices } from '@/lib/catalog-api'

// Next.js expects route metadata to be exported from the page module.
// oxlint-disable-next-line react/only-export-components
export const metadata: Metadata = {
  title: 'Услуги — M1 Сервис',
  description: 'Услуги сети автосервисов M1 Сервис',
}

export default async function ServicesPage() {
  await connection()

  let services: Awaited<ReturnType<typeof getServices>> | null = null

  try {
    services = await getServices()
  } catch {
    services = null
  }

  return (
    <SiteLayout footerNote="Каталог услуг M1">
      <CatalogPageLayout
        eyebrow="Каталог"
        title="Услуги"
        description="Понятный перечень работ с ориентировочной стоимостью и временем выполнения."
      >
        <CatalogGrid
          items={services}
          emptyMessage="Активных услуг пока нет."
          renderItem={(service, index) => (
            <ServiceCard key={service.id} service={service} index={index} />
          )}
        />
      </CatalogPageLayout>
    </SiteLayout>
  )
}
