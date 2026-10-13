'use client'

import type { ServiceSummary } from '@/lib/catalog-api'
import { useCarousel } from '@/hooks/use-carousel'
import { CatalogError } from './catalog-error'
import { SectionHeading } from './section-heading'
import { ServiceCard } from './service-card'

type ServiceSliderProps = {
  services: ServiceSummary[] | null
}

export function ServiceSlider({ services }: ServiceSliderProps) {
  const serviceCount = services?.length ?? 0
  const { activeIndex, goToSlide, trackRef, updateActiveSlide } =
    useCarousel(serviceCount)

  return (
    <div className="service-slider">
      <div className="slider-header service-slider__header">
        <SectionHeading
          eyebrow="Что обслуживаем"
          title="Популярные услуги"
          titleId="services-title"
          href="/services"
          linkLabel="Все услуги"
        />

        {serviceCount > 0 ? (
          <span
            className="slider-count service-slider__count"
            aria-label={`Слайд ${activeIndex + 1} из ${serviceCount}`}
            aria-live="polite"
          >
            {String(activeIndex + 1).padStart(2, '0')}
            <span aria-hidden="true"> / </span>
            {String(serviceCount).padStart(2, '0')}
          </span>
        ) : null}
      </div>

      {services === null ? (
        <CatalogError />
      ) : services.length === 0 ? (
        <div className="catalog-message">Активных услуг пока нет.</div>
      ) : (
        <div className="slider-viewport service-slider__viewport">
          <div
            ref={trackRef}
            className="service-slider__track"
            onScroll={updateActiveSlide}
            aria-label="Популярные услуги"
          >
            {services.map((service, index) => (
              <div
                className="service-slide"
                key={service.id}
                role="group"
                aria-roledescription="слайд"
                aria-label={`${service.name}, слайд ${index + 1} из ${services.length}`}
              >
                <ServiceCard service={service} index={index} />
              </div>
            ))}
          </div>

          {serviceCount > 1 ? (
            <>
              <button
                type="button"
                className="slider-arrow slider-arrow--previous service-slider__arrow"
                onClick={() => goToSlide(activeIndex - 1)}
                aria-label="Предыдущая услуга"
              >
                &lt;
              </button>
              <button
                type="button"
                className="slider-arrow slider-arrow--next service-slider__arrow"
                onClick={() => goToSlide(activeIndex + 1)}
                aria-label="Следующая услуга"
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
