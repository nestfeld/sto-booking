import Link from 'next/link'
import { BookingPreview } from './booking-preview'
import { Eyebrow } from './eyebrow'
import { FeatureIcon } from './feature-icon'
import { HealthIndicator } from './health-indicator'

type HeroService = {
  id: number
  name: string
  durationMinutes: number
}

type HeroSectionProps = {
  services: HeroService[]
}

const principles = [
  { value: '24/7', label: 'Онлайн-запись', icon: 'always-open' },
  { value: '3 шага', label: 'До подтверждения', icon: 'three-steps' },
  { value: 'Без звонка', label: 'В удобное время', icon: 'online-booking' },
] as const

export function HeroSection({ services }: HeroSectionProps) {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero__content">
        <Eyebrow>Сеть автосервисов</Eyebrow>
        <h1 id="hero-title">
          Сервис без
          <span> ожидания</span>
        </h1>
        <p className="hero__lead">
          Выберите услугу, удобный автосервис и свободное время. Остальное мы
          подготовим к вашему приезду.
        </p>

        <div className="hero__actions" id="booking">
          <Link className="primary-action" href="/booking">
            Записаться онлайн
            <span aria-hidden="true">↗</span>
          </Link>
          <HealthIndicator />
        </div>

        <dl className="principles">
          {principles.map((principle) => (
            <div key={principle.value}>
              <FeatureIcon name={principle.icon} />
              <dt>{principle.value}</dt>
              <dd>{principle.label}</dd>
            </div>
          ))}
        </dl>
      </div>

      <BookingPreview services={services} />
    </section>
  )
}
