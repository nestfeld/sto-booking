'use client'

import Link from 'next/link'
import { FormEvent, useEffect, useState } from 'react'
import { AuthApiError, getCurrentUser, type AuthUser } from '@/lib/auth-api'
import {
  BookingApiError,
  createBooking,
  getAvailability,
  getServiceDetails,
  type AvailabilitySlot,
  type CreatedBooking,
  type ServiceStationOffer,
} from '@/lib/booking-api'
import type { ServiceSummary } from '@/lib/catalog-api'
import { getVehicles, type Vehicle } from '@/lib/vehicles-api'
import { DateCalendar } from './date-calendar'
import { ServiceIcon } from './service-icon'

type BookingFlowProps = {
  services: ServiceSummary[]
  minDate: string
  maxDate: string
}

type Step = 1 | 2 | 3

type CustomerState =
  | { status: 'loading'; user: null; vehicles: Vehicle[] }
  | { status: 'guest'; user: null; vehicles: Vehicle[] }
  | { status: 'authenticated'; user: AuthUser; vehicles: Vehicle[] }

const steps = ['Услуга', 'СТО и время', 'Контакты']
const priceFormatter = new Intl.NumberFormat('ru-RU')

function formatDate(date: string) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${date}T12:00:00`))
}

function formatTime(value: string, timezone?: string) {
  return new Intl.DateTimeFormat('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: timezone,
  }).format(new Date(value))
}

export function BookingFlow({ services, minDate, maxDate }: BookingFlowProps) {
  const [step, setStep] = useState<Step>(1)
  const [selectedService, setSelectedService] = useState<ServiceSummary | null>(
    null,
  )
  const [stations, setStations] = useState<ServiceStationOffer[]>([])
  const [selectedStation, setSelectedStation] =
    useState<ServiceStationOffer | null>(null)
  const [date, setDate] = useState(minDate)
  const [slots, setSlots] = useState<AvailabilitySlot[]>([])
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null)
  const [isLoadingStations, setIsLoadingStations] = useState(false)
  const [isLoadingSlots, setIsLoadingSlots] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [booking, setBooking] = useState<CreatedBooking | null>(null)
  const [customerName, setCustomerName] = useState('')
  const [phone, setPhone] = useState('')
  const [vehicle, setVehicle] = useState('')
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null)
  const [customer, setCustomer] = useState<CustomerState>({
    status: 'loading',
    user: null,
    vehicles: [],
  })

  useEffect(() => {
    let isMounted = true

    getCurrentUser()
      .then(async ({ user }) => {
        const vehicles = await getVehicles().catch(() => [])
        if (!isMounted) return

        setCustomer({ status: 'authenticated', user, vehicles })
        setSelectedVehicleId(vehicles[0]?.id ?? null)
      })
      .catch((requestError: unknown) => {
        if (!isMounted) return

        if (requestError instanceof AuthApiError && requestError.status === 401) {
          setCustomer({ status: 'guest', user: null, vehicles: [] })
          return
        }

        setCustomer({ status: 'guest', user: null, vehicles: [] })
      })

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (step !== 2 || !selectedService || !selectedStation || !date) return

    const controller = new AbortController()

    getAvailability(
      selectedStation.id,
      selectedService.id,
      date,
      controller.signal,
    )
      .then((response) => setSlots(response.slots))
      .catch((requestError: unknown) => {
        if (requestError instanceof DOMException && requestError.name === 'AbortError') {
          return
        }

        setError(
          requestError instanceof BookingApiError
            ? requestError.message
            : 'Не удалось загрузить свободное время',
        )
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoadingSlots(false)
      })

    return () => controller.abort()
  }, [date, selectedService, selectedStation, step])

  function chooseService(service: ServiceSummary) {
    setSelectedService(service)
    setSelectedStation(null)
    setStations([])
    setSelectedSlot(null)
    setSlots([])
    setError(null)
  }

  async function continueToSchedule() {
    if (!selectedService) return

    setIsLoadingStations(true)
    setError(null)

    try {
      const details = await getServiceDetails(selectedService.id)
      setStations(details.stations)
      setStep(2)
    } catch (requestError) {
      setError(
        requestError instanceof BookingApiError
          ? requestError.message
          : 'Не удалось загрузить филиалы',
      )
    } finally {
      setIsLoadingStations(false)
    }
  }

  function chooseStation(station: ServiceStationOffer) {
    setSelectedStation(station)
    setSelectedSlot(null)
    setSlots([])
    setIsLoadingSlots(true)
    setError(null)
  }

  function chooseDate(nextDate: string) {
    setDate(nextDate)
    setSelectedSlot(null)
    setSlots([])
    setIsLoadingSlots(Boolean(nextDate))
    setError(null)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedService || !selectedStation || !selectedSlot) return

    setIsSubmitting(true)
    setError(null)

    try {
      const result = await createBooking({
        stationId: selectedStation.id,
        serviceId: selectedService.id,
        startsAt: selectedSlot.startsAt,
        ...(customer.status === 'authenticated'
          ? selectedVehicleId
            ? { vehicleId: selectedVehicleId }
            : { vehicle }
          : { customerName, phone, vehicle }),
      })
      setBooking(result)
    } catch (requestError) {
      if (requestError instanceof BookingApiError && requestError.status === 409) {
        setSlots([])
        setIsLoadingSlots(true)
        setStep(2)
        setSelectedSlot(null)
        setError('Это время уже заняли. Выберите другой свободный слот.')
      } else {
        setError(
          requestError instanceof BookingApiError
            ? requestError.message
            : 'Не удалось создать запись',
        )
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  if (booking && selectedService && selectedStation) {
    return (
      <section className="booking-success" aria-labelledby="booking-success-title">
        <span className="booking-success__icon" aria-hidden="true">
          ✓
        </span>
        <p className="booking-kicker">Запись создана</p>
        <h1 id="booking-success-title">Ждём вас в M1</h1>
        <p className="booking-success__lead">
          Заявка №{booking.id} принята и ожидает подтверждения автосервисом.
        </p>

        <dl className="booking-success__details">
          <div>
            <dt>Услуга</dt>
            <dd>{selectedService.name}</dd>
          </div>
          <div>
            <dt>Филиал</dt>
            <dd>{selectedStation.name}</dd>
          </div>
          <div>
            <dt>Дата и время</dt>
            <dd>
              {formatDate(date)}, {formatTime(booking.startsAt, selectedStation.timezone)}
            </dd>
          </div>
          <div>
            <dt>Автомобиль</dt>
            <dd>{booking.vehicle}</dd>
          </div>
        </dl>

        <div className="booking-success__actions">
          <Link className="booking-primary-button" href="/">
            На главную <span aria-hidden="true">→</span>
          </Link>
          <Link className="booking-secondary-button" href="/account">
            Личный кабинет
          </Link>
        </div>
      </section>
    )
  }

  const selectedVehicleName = selectedVehicleId
    ? customer.vehicles.find((item) => item.id === selectedVehicleId)?.name
    : vehicle
  const canSubmit =
    customer.status === 'authenticated'
      ? Boolean(selectedVehicleName?.trim())
      : customer.status === 'guest' &&
        Boolean(customerName.trim() && phone.trim() && vehicle.trim())

  return (
    <section className="booking-page" aria-labelledby="booking-title">
      <div className="booking-page__intro">
        <p className="booking-kicker">Онлайн-запись</p>
        <h1 id="booking-title">
          Запись без <span>звонка</span>
        </h1>
        <p>Выберите удобное время — подходящий рабочий пост мы назначим автоматически.</p>
      </div>

      <nav className="booking-progress" aria-label="Этапы записи">
        <ol>
          {steps.map((label, index) => {
            const number = (index + 1) as Step
            const visibleLabel =
              number === 3 && customer.status === 'authenticated'
                ? 'Автомобиль'
                : label
            return (
              <li
                key={label}
                className={number === step ? 'is-active' : number < step ? 'is-complete' : ''}
                aria-current={number === step ? 'step' : undefined}
              >
                <span>{String(number).padStart(2, '0')}</span>
                {visibleLabel}
              </li>
            )
          })}
        </ol>
      </nav>

      {error ? (
        <div className="booking-error" role="alert">
          <span aria-hidden="true">!</span>
          {error}
        </div>
      ) : null}

      <div className="booking-layout">
        <div className="booking-panel">
          {step === 1 ? (
            <div className="booking-step">
              <div className="booking-step__heading">
                <span>Шаг 01</span>
                <h2>Выберите услугу</h2>
                <p>Стоимость и длительность могут отличаться в зависимости от филиала.</p>
              </div>

              <div className="booking-service-list">
                {services.map((service) => (
                  <button
                    type="button"
                    key={service.id}
                    className={selectedService?.id === service.id ? 'is-selected' : undefined}
                    aria-pressed={selectedService?.id === service.id}
                    onClick={() => chooseService(service)}
                  >
                    <span className="booking-option-icon" aria-hidden="true">
                      <ServiceIcon slug={service.slug} />
                    </span>
                    <span className="booking-option-copy">
                      <small>{service.category}</small>
                      <strong>{service.name}</strong>
                      <span>{service.description}</span>
                    </span>
                    <span className="booking-option-meta">
                      <strong>от {priceFormatter.format(service.priceFrom)} ₸</strong>
                      <small>от {service.durationMinutes} мин</small>
                    </span>
                    <span className="booking-option-check" aria-hidden="true" />
                  </button>
                ))}
              </div>

              <div className="booking-step__actions booking-step__actions--end">
                <button
                  className="booking-primary-button"
                  type="button"
                  disabled={!selectedService || isLoadingStations}
                  onClick={continueToSchedule}
                >
                  {isLoadingStations ? 'Загружаем…' : 'Выбрать СТО'}
                  <span aria-hidden="true">→</span>
                </button>
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="booking-step">
              <div className="booking-step__heading">
                <span>Шаг 02</span>
                <h2>Филиал и время</h2>
                <p>Показываем только СТО, где доступна выбранная услуга.</p>
              </div>

              <div className="booking-station-list">
                {stations.map((station) => (
                  <button
                    type="button"
                    key={station.id}
                    className={selectedStation?.id === station.id ? 'is-selected' : undefined}
                    aria-pressed={selectedStation?.id === station.id}
                    onClick={() => chooseStation(station)}
                  >
                    <span>
                      <small>Филиал M1</small>
                      <strong>{station.name}</strong>
                      <span>{station.address}</span>
                    </span>
                    <span className="booking-station-price">
                      от {priceFormatter.format(station.priceFrom)} ₸
                    </span>
                  </button>
                ))}
              </div>

              {selectedStation ? (
                <div className="booking-schedule">
                  <div className="booking-date-field">
                    <span className="booking-date-field__label">Дата визита</span>
                    <DateCalendar
                      min={minDate}
                      max={maxDate}
                      value={date}
                      onChange={chooseDate}
                    />
                    <small>Часовой пояс: {selectedStation.timezone}</small>
                  </div>

                  <div className="booking-time-picker">
                    <div className="booking-time-picker__heading">
                      <span>Свободное время</span>
                      <small>{date ? formatDate(date) : 'Выберите дату'}</small>
                    </div>

                    {isLoadingSlots ? (
                      <div className="booking-inline-status" role="status">
                        <span aria-hidden="true" /> Ищем свободные посты
                      </div>
                    ) : slots.length > 0 ? (
                      <div className="booking-time-grid">
                        {slots.map((slot) => (
                          <button
                            type="button"
                            key={slot.startsAt}
                            className={selectedSlot?.startsAt === slot.startsAt ? 'is-selected' : undefined}
                            aria-pressed={selectedSlot?.startsAt === slot.startsAt}
                            onClick={() => setSelectedSlot(slot)}
                          >
                            {formatTime(slot.startsAt, selectedStation.timezone)}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="booking-empty-time">
                        На эту дату свободного времени нет. Выберите другой день.
                      </p>
                    )}
                  </div>
                </div>
              ) : null}

              <div className="booking-step__actions">
                <button
                  className="booking-secondary-button"
                  type="button"
                  onClick={() => {
                    setStep(1)
                    setError(null)
                  }}
                >
                  ← Назад
                </button>
                <button
                  className="booking-primary-button"
                  type="button"
                  disabled={!selectedStation || !selectedSlot}
                  onClick={() => {
                    setStep(3)
                    setError(null)
                  }}
                >
                  {customer.status === 'authenticated' ? 'Выбрать автомобиль' : 'Контактные данные'}{' '}
                  <span aria-hidden="true">→</span>
                </button>
              </div>
            </div>
          ) : null}

          {step === 3 ? (
            <form className="booking-step" onSubmit={handleSubmit}>
              <div className="booking-step__heading">
                <span>Шаг 03</span>
                <h2>
                  {customer.status === 'authenticated'
                    ? 'Выберите автомобиль'
                    : customer.status === 'loading'
                      ? 'Подготавливаем запись'
                      : 'Контактные данные'}
                </h2>
                <p>
                  {customer.status === 'authenticated'
                    ? 'Имя и телефон возьмём из вашего профиля.'
                    : 'Регистрация не обязательна. Мы используем данные только для вашей записи.'}
                </p>
              </div>

              {customer.status === 'loading' ? (
                <div className="booking-inline-status" role="status">
                  <span aria-hidden="true" /> Проверяем профиль
                </div>
              ) : customer.status === 'authenticated' ? (
                <div className="booking-account-details">
                  <div className="booking-profile-contact">
                    <span aria-hidden="true">
                      {customer.user.name.slice(0, 1).toUpperCase()}
                    </span>
                    <div>
                      <strong>{customer.user.name}</strong>
                      <small>{customer.user.phone}</small>
                    </div>
                  </div>

                  {customer.vehicles.length > 0 ? (
                    <div className="booking-vehicle-options" aria-label="Ваши автомобили">
                      {customer.vehicles.map((savedVehicle) => (
                        <button
                          type="button"
                          key={savedVehicle.id}
                          className={selectedVehicleId === savedVehicle.id ? 'is-selected' : undefined}
                          aria-pressed={selectedVehicleId === savedVehicle.id}
                          onClick={() => setSelectedVehicleId(savedVehicle.id)}
                        >
                          <span aria-hidden="true">M1</span>
                          {savedVehicle.name}
                          <i aria-hidden="true" />
                        </button>
                      ))}
                      <button
                        type="button"
                        className={selectedVehicleId === null ? 'is-selected' : undefined}
                        aria-pressed={selectedVehicleId === null}
                        onClick={() => setSelectedVehicleId(null)}
                      >
                        <span aria-hidden="true">+</span>
                        Другой автомобиль
                        <i aria-hidden="true" />
                      </button>
                    </div>
                  ) : null}

                  {selectedVehicleId === null ? (
                    <label className="booking-new-vehicle">
                      <span>Новый автомобиль</span>
                      <input
                        type="text"
                        value={vehicle}
                        onChange={(event) => setVehicle(event.target.value)}
                        minLength={2}
                        maxLength={120}
                        placeholder="Марка, модель и год"
                        required
                      />
                      <small>Этот автомобиль используется только для текущей записи.</small>
                    </label>
                  ) : null}
                </div>
              ) : (
                <div className="booking-contact-grid">
                  <label>
                    <span>Ваше имя</span>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(event) => setCustomerName(event.target.value)}
                      minLength={2}
                      maxLength={80}
                      autoComplete="name"
                      placeholder="Иван Петров"
                      required
                    />
                  </label>
                  <label>
                    <span>Телефон</span>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      minLength={7}
                      maxLength={24}
                      autoComplete="tel"
                      placeholder="+7 700 000 00 00"
                      required
                    />
                  </label>
                  <label className="booking-contact-grid__vehicle">
                    <span>Автомобиль</span>
                    <input
                      type="text"
                      value={vehicle}
                      onChange={(event) => setVehicle(event.target.value)}
                      minLength={2}
                      maxLength={120}
                      placeholder="Марка, модель и год"
                      required
                    />
                  </label>
                </div>
              )}

              <p className="booking-privacy">
                Нажимая «Создать запись», вы подтверждаете правильность указанных данных.
              </p>

              <div className="booking-step__actions">
                <button
                  className="booking-secondary-button"
                  type="button"
                  onClick={() => {
                    setSlots([])
                    setIsLoadingSlots(true)
                    setStep(2)
                    setError(null)
                  }}
                >
                  ← Назад
                </button>
                <button
                  className="booking-primary-button"
                  type="submit"
                  disabled={isSubmitting || !canSubmit}
                >
                  {isSubmitting ? 'Создаём запись…' : 'Создать запись'}
                  <span aria-hidden="true">→</span>
                </button>
              </div>
            </form>
          ) : null}
        </div>

        <aside className="booking-summary" aria-label="Ваша запись">
          <div className="booking-summary__heading">
            <span>Ваша запись</span>
            <strong>{String(step).padStart(2, '0')} / 03</strong>
          </div>

          <dl>
            <div className={selectedService ? 'is-filled' : undefined}>
              <dt>Услуга</dt>
              <dd>{selectedService?.name ?? 'Не выбрана'}</dd>
            </div>
            <div className={selectedStation ? 'is-filled' : undefined}>
              <dt>Филиал</dt>
              <dd>{selectedStation?.name ?? 'Не выбран'}</dd>
            </div>
            <div className={selectedSlot ? 'is-filled' : undefined}>
              <dt>Дата и время</dt>
              <dd>
                {selectedSlot && selectedStation
                  ? `${formatDate(date)}, ${formatTime(selectedSlot.startsAt, selectedStation.timezone)}`
                  : 'Не выбраны'}
              </dd>
            </div>
            <div className={selectedVehicleName ? 'is-filled' : undefined}>
              <dt>Автомобиль</dt>
              <dd>{selectedVehicleName || 'Не выбран'}</dd>
            </div>
          </dl>

          {selectedStation ? (
            <div className="booking-summary__total">
              <span>Стоимость от</span>
              <strong>{priceFormatter.format(selectedStation.priceFrom)} ₸</strong>
              <small>Точная стоимость после осмотра</small>
            </div>
          ) : null}
        </aside>
      </div>
    </section>
  )
}
