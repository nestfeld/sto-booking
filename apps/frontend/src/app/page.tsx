import { connection } from 'next/server'
import { HeroSection } from '@/components/hero-section'
import { ServiceSlider } from '@/components/service-slider'
import { SiteLayout } from '@/components/site-layout'
import { StationSlider } from '@/components/station-slider'
import { getServices, getStations } from '@/lib/catalog-api'

const previewFallback = [
  { id: 1, name: 'Диагностика автомобиля', durationMinutes: 45 },
  { id: 2, name: 'Техническое обслуживание', durationMinutes: 90 },
  { id: 3, name: 'Ремонт ходовой части', durationMinutes: 120 },
]

export default async function HomePage() {
  await connection()

  const [servicesResult, stationsResult] = await Promise.allSettled([
    getServices(),
    getStations(),
  ])

  const services = servicesResult.status === 'fulfilled' ? servicesResult.value : null
  const stations = stationsResult.status === 'fulfilled' ? stationsResult.value : null
  const previewServices = services?.slice(0, 3) ?? previewFallback

  return (
    <SiteLayout>
      <HeroSection services={previewServices} />

      <section className="home-catalog station-showcase" aria-labelledby="stations-title">
        <StationSlider stations={stations} />
      </section>

      <section className="home-catalog service-showcase" aria-labelledby="services-title">
        <ServiceSlider services={services?.slice(0, 3) ?? null} />
      </section>
    </SiteLayout>
  )
}
