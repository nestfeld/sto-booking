import Link from 'next/link'
import type { StationSummary } from '@/lib/catalog-api'
import { SectionHeading } from './section-heading'

type ContactSectionProps = {
  stations: StationSummary[] | null
}

export function ContactSection({ stations }: ContactSectionProps) {
  const primaryStation = stations?.find((station) => station.phone) ?? stations?.[0]
  const stationCount = stations?.length ?? 0

  return (
    <section id="contacts" className="contact-section" aria-labelledby="contacts-title">
      <SectionHeading
        eyebrow="На связи"
        title="Контакты"
        titleId="contacts-title"
        href="/stations"
        linkLabel="Все филиалы"
      />

      <div className="contact-panel">
        <div className="contact-panel__intro">
          <p>
            Подскажем по услугам и поможем выбрать удобный филиал M1 Сервис.
          </p>
          <Link className="contact-panel__booking" href="/booking">
            Записаться онлайн
            <span aria-hidden="true">→</span>
          </Link>
        </div>

        <dl className="contact-panel__details">
          <div>
            <dt>Телефон</dt>
            <dd>
              {primaryStation?.phone ? (
                <a href={`tel:${primaryStation.phone.replace(/[^+\d]/g, '')}`}>
                  {primaryStation.phone}
                </a>
              ) : (
                <Link href="/stations">Выбрать филиал</Link>
              )}
            </dd>
            {primaryStation?.name ? <small>{primaryStation.name}</small> : null}
          </div>

          <div>
            <dt>Наши СТО</dt>
            <dd>{stationCount > 0 ? `${stationCount} СТО` : 'Адреса филиалов'}</dd>
            <small>Адрес и телефон каждого сервиса</small>
          </div>

          <div>
            <dt>Онлайн-запись</dt>
            <dd>24/7</dd>
            <small>Без звонка, в удобное время</small>
          </div>
        </dl>
      </div>
    </section>
  )
}
