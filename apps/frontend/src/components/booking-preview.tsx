'use client'

import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import Link from 'next/link'

type PreviewService = {
  id: number
  name: string
  durationMinutes: number
}

type BookingPreviewProps = {
  services: PreviewService[]
}

export function BookingPreview({ services }: BookingPreviewProps) {
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    const shouldReduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce), (max-width: 700px), (pointer: coarse)',
    ).matches

    if (services.length < 2 || shouldReduceMotion) {
      return
    }

    let intervalId: number | null = null

    function updateAnimation() {
      if (intervalId !== null) {
        window.clearInterval(intervalId)
        intervalId = null
      }

      if (document.hidden) return

      intervalId = window.setInterval(() => {
        setActiveIndex((currentIndex) => (currentIndex + 1) % services.length)
      }, 3600)
    }

    updateAnimation()
    document.addEventListener('visibilitychange', updateAnimation)

    return () => {
      document.removeEventListener('visibilitychange', updateAnimation)
      if (intervalId !== null) window.clearInterval(intervalId)
    }
  }, [services.length])

  return (
    <div className="hero__visual" aria-label="Предварительный вид формы записи">
      <div className="visual-glow" aria-hidden="true" />
      <article className="booking-preview">
        <div className="booking-preview__surface" aria-hidden="true" />
        <div className="booking-preview__header">
          <div>
            <span>Онлайн-запись</span>
            <h2>Выберите услугу</h2>
          </div>
          <span className="step">01 / 03</span>
        </div>

        <div className="booking-preview__options">
          <span
            className="booking-preview__highlight"
            style={{ '--active-index': activeIndex } as CSSProperties}
            aria-hidden="true"
          />
          {services.map((service, index) => (
            <div
              className={`service-option${index === activeIndex ? ' service-option--active' : ''}`}
              key={service.id}
            >
              <span className="service-option__icon" aria-hidden="true">
                {String(index + 1).padStart(2, '0')}
              </span>
              <span>
                <strong>{service.name}</strong>
                <small>от {service.durationMinutes} минут</small>
              </span>
              <span className="radio" aria-hidden="true" />
            </div>
          ))}
        </div>

        <div className="preview-footer">
          <span>Следующий шаг</span>
          <Link href="/booking">Перейти к записи →</Link>
        </div>
      </article>
    </div>
  )
}
