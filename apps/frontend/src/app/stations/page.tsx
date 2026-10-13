import type { Metadata } from 'next'
import { connection } from 'next/server'
import { CatalogGrid } from '@/components/catalog-grid'
import { CatalogPageLayout } from '@/components/catalog-page-layout'
import { SiteLayout } from '@/components/site-layout'
import { StationCard } from '@/components/station-card'
import { getStations } from '@/lib/catalog-api'

// Next.js expects route metadata to be exported from the page module.
// oxlint-disable-next-line react/only-export-components
export const metadata: Metadata = {
  title: 'Наши СТО — M1 Сервис',
  description: 'Адреса автосервисов сети M1 Сервис',
}

export default async function StationsPage() {
  await connection()

  let stations: Awaited<ReturnType<typeof getStations>> | null = null

  try {
    stations = await getStations()
  } catch {
    stations = null
  }

  return (
    <SiteLayout footerNote="Сеть автосервисов M1">
      <CatalogPageLayout
        eyebrow="Сеть M1"
        title="Наши СТО"
        description="Выберите удобный филиал. Набор услуг и длительность работ учитываются отдельно для каждого СТО."
      >
        <CatalogGrid
          items={stations}
          emptyMessage="Активных СТО пока нет."
          variant="stations"
          renderItem={(station, index) => (
            <StationCard key={station.id} station={station} index={index} />
          )}
        />
      </CatalogPageLayout>
    </SiteLayout>
  )
}
