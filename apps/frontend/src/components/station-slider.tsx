'use client'

import Image from 'next/image'
import Link from 'next/link'
import type { StationSummary } from '@/lib/catalog-api'
import { useCarousel } from '@/hooks/use-carousel'
import { CatalogError } from './catalog-error'
import { SectionHeading } from './section-heading'

type StationSliderProps = {
  stations: StationSummary[] | null
}

export function StationSlider({ stations }: StationSliderProps) {
  const stationCount = stations?.length ?? 0
  const { activeIndex, goToSlide, trackRef, updateActiveSlide } =
    useCarousel(stationCount)

  return (
    <div className="station-slider">
      <div className="slider-header station-slider__header">
        <SectionHeading
          eyebrow="Рядом с вами"
          title="Наши СТО"
          titleId="stations-title"
          href="/stations"
          linkLabel="Все филиалы"
        />

        {stationCount > 0 ? (
          <span
            className="slider-count station-slider__count"
            aria-label={`Слайд ${activeIndex + 1} из ${stationCount}`}
            aria-live="polite"
          >
            {String(activeIndex + 1).padStart(2, '0')}
            <span aria-hidden="true"> / </span>
            {String(stationCount).padStart(2, '0')}
          </span>
        ) : null}
      </div>

      {stations === null ? (
        <CatalogError />
      ) : stations.length === 0 ? (
        <div className="catalog-message">Активных СТО пока нет.</div>
      ) : (
        <div className="slider-viewport station-slider__viewport">
          <div
            ref={trackRef}
            className="station-slider__track"
            onScroll={updateActiveSlide}
            aria-label="Доступные автосервисы"
          >
            {stations.map((station, index) => (
              <article
                className="station-slide"
                key={station.id}
                role="group"
                aria-roledescription="слайд"
                aria-label={`${station.name}, слайд ${index + 1} из ${stations.length}`}
              >
                <div className="station-slide__image">
                  <Image
                    src="/images/sto-service-center.webp"
                    alt="Современный автосервис M1 в вечернее время"
                    fill
                    sizes="(max-width: 560px) 90vw, (max-width: 900px) 80vw, 52vw"
                  />
                  <div className="station-slide__image-shade" aria-hidden="true" />
                  <div className="station-slide__brand" aria-hidden="true">
                    <strong>M1</strong>
                    <span>Сервис</span>
                  </div>
                </div>

                <div className="station-slide__content">
                  <div className="station-slide__status">
                    <span className="availability-dot" aria-hidden="true" />
                    Доступна онлайн-запись
                  </div>
                  <p className="station-slide__eyebrow">Автосервис сети</p>
                  <h3>{station.name}</h3>
                  <p className="station-slide__address">{station.address}</p>

                  <dl className="station-slide__meta">
                    <div>
                      <dt>Телефон</dt>
                      <dd>{station.phone ?? 'Уточняется'}</dd>
                    </div>
                    <div>
                      <dt>Направления</dt>
                      <dd>{station.serviceCount}</dd>
                    </div>
                  </dl>

                  <Link className="station-slide__link" href="/stations">
                    Подробнее о филиале
                    <span aria-hidden="true">↗</span>
                  </Link>
                </div>
              </article>
            ))}
          </div>

          {stationCount > 1 ? (
            <>
              <button
                type="button"
                className="slider-arrow slider-arrow--previous station-slider__arrow"
                onClick={() => goToSlide(activeIndex - 1)}
                aria-label="Предыдущая СТО"
              >
                &lt;
              </button>
              <button
                type="button"
                className="slider-arrow slider-arrow--next station-slider__arrow"
                onClick={() => goToSlide(activeIndex + 1)}
                aria-label="Следующая СТО"
              >
                &gt;
              </button>
            </>
          ) : null}
        </div>
      )}
    </div>
  )
}
