import type { Metadata } from 'next'
import Link from 'next/link'
import { connection } from 'next/server'
import { BookingFlow } from '@/components/booking-flow'
import { SiteLayout } from '@/components/site-layout'
import { getServices } from '@/lib/catalog-api'

// Next.js expects route metadata to be exported from the page module.
// oxlint-disable-next-line react/only-export-components
export const metadata: Metadata = {
  title: 'Онлайн-запись — M1 Сервис',
  description: 'Выберите услугу, филиал и удобное время для визита в M1 Сервис',
}

function formatDateInTimezone(date: Date, timezone: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
      .formatToParts(date)
      .filter(({ type }) => type !== 'literal')
      .map(({ type, value }) => [type, value]),
  )

  return `${parts.year}-${parts.month}-${parts.day}`
}

export default async function BookingPage() {
  await connection()

  // The booking window is intentionally calculated for each incoming request.
  // oxlint-disable-next-line react/purity
  const now = new Date()
  const bookingTimezone = 'Asia/Qyzylorda'
  const minDate = formatDateInTimezone(now, bookingTimezone)
  const maxDate = formatDateInTimezone(
    new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000),
    bookingTimezone,
  )

  let services: Awaited<ReturnType<typeof getServices>> = []
  try {
    services = await getServices()
  } catch {
    services = []
  }

  return (
    <SiteLayout footerNote="Онлайн-запись M1">
      {services.length > 0 ? (
        <BookingFlow services={services} minDate={minDate} maxDate={maxDate} />
      ) : (
        <section className="booking-unavailable">
          <span aria-hidden="true">!</span>
          <h1>Запись временно недоступна</h1>
          <p>Не удалось получить список услуг. Попробуйте обновить страницу немного позже.</p>
          <Link href="/">Вернуться на главную</Link>
        </section>
      )}
    </SiteLayout>
  )
}
