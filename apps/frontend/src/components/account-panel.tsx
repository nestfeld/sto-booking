'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { type FormEvent, useEffect, useMemo, useState } from 'react'
import {
  AuthApiError,
  getCurrentUser,
  logout,
  updateProfile,
  type AuthUser,
} from '@/lib/auth-api'
import {
  BookingApiError,
  getMyBookings,
  type BookingStatus,
  type UserBooking,
} from '@/lib/booking-api'
import {
  addVehicle,
  getVehicles,
  removeVehicle,
  VehiclesApiError,
  type Vehicle,
} from '@/lib/vehicles-api'

type AccountTab = 'active' | 'history' | 'garage' | 'profile'

type AccountState =
  | { status: 'loading' }
  | {
      status: 'ready'
      user: AuthUser
      vehicles: Vehicle[]
      bookings: UserBooking[]
    }
  | { status: 'error' }

const activeStatuses = new Set<BookingStatus>([
  'PENDING',
  'CONFIRMED',
  'IN_PROGRESS',
])

const bookingStatusLabels: Record<BookingStatus, string> = {
  PENDING: 'Ожидает подтверждения',
  CONFIRMED: 'Подтверждена',
  IN_PROGRESS: 'Автомобиль в работе',
  COMPLETED: 'Завершена',
  CANCELLED: 'Отменена',
}

const priceFormatter = new Intl.NumberFormat('ru-RU')

function formatVisitDate(booking: UserBooking) {
  return new Intl.DateTimeFormat('ru-RU', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: booking.station.timezone,
  }).format(new Date(booking.startsAt))
}

function BookingList({
  bookings,
  emptyTitle,
  emptyText,
  showBookingLink = false,
}: {
  bookings: UserBooking[]
  emptyTitle: string
  emptyText: string
  showBookingLink?: boolean
}) {
  if (bookings.length === 0) {
    return (
      <div className="account-empty">
        <span aria-hidden="true">M1</span>
        <div>
          <strong>{emptyTitle}</strong>
          <p>{emptyText}</p>
        </div>
        {showBookingLink ? (
          <Link href="/booking">
            Выбрать услугу <span aria-hidden="true">→</span>
          </Link>
        ) : null}
      </div>
    )
  }

  return (
    <div className="account-bookings">
      {bookings.map((booking) => (
        <article className="account-booking" key={booking.id}>
          <div className="account-booking__topline">
            <span data-status={booking.status}>
              {bookingStatusLabels[booking.status]}
            </span>
            <small>№ {String(booking.id).padStart(4, '0')}</small>
          </div>
          <h3>{booking.service.name}</h3>
          <time dateTime={booking.startsAt}>{formatVisitDate(booking)}</time>
          <dl>
            <div>
              <dt>Филиал</dt>
              <dd>{booking.station.name}</dd>
            </div>
            <div>
              <dt>Автомобиль</dt>
              <dd>{booking.vehicle}</dd>
            </div>
            <div>
              <dt>Стоимость</dt>
              <dd>
                {booking.priceAmount === null
                  ? 'После диагностики'
                  : `от ${priceFormatter.format(booking.priceAmount)} ₸`}
              </dd>
            </div>
          </dl>
          <p>{booking.station.address}</p>
        </article>
      ))}
    </div>
  )
}

export function AccountPanel() {
  const router = useRouter()
  const [state, setState] = useState<AccountState>({ status: 'loading' })
  const [activeTab, setActiveTab] = useState<AccountTab>('active')
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [vehicleName, setVehicleName] = useState('')
  const [vehicleError, setVehicleError] = useState<string | null>(null)
  const [isAddingVehicle, setIsAddingVehicle] = useState(false)
  const [removingVehicleId, setRemovingVehicleId] = useState<number | null>(null)
  const [profileName, setProfileName] = useState('')
  const [profilePhone, setProfilePhone] = useState('')
  const [profileError, setProfileError] = useState<string | null>(null)
  const [profileMessage, setProfileMessage] = useState<string | null>(null)
  const [isSavingProfile, setIsSavingProfile] = useState(false)

  useEffect(() => {
    const controller = new AbortController()

    getCurrentUser()
      .then(async ({ user }) => {
        const [vehicles, bookings] = await Promise.all([
          getVehicles(),
          getMyBookings(),
        ])

        if (!controller.signal.aborted) {
          setProfileName(user.name)
          setProfilePhone(user.phone)
          setState({ status: 'ready', user, vehicles, bookings })
        }
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return

        if (
          (error instanceof AuthApiError ||
            error instanceof VehiclesApiError ||
            error instanceof BookingApiError) &&
          error.status === 401
        ) {
          router.replace('/login')
          return
        }

        setState({ status: 'error' })
      })

    return () => controller.abort()
  }, [router])

  const activeBookings = useMemo(() => {
    if (state.status !== 'ready') return []

    return state.bookings
      .filter((booking) => activeStatuses.has(booking.status))
      .sort(
        (first, second) =>
          new Date(first.startsAt).getTime() - new Date(second.startsAt).getTime(),
      )
  }, [state])

  const bookingHistory = useMemo(() => {
    if (state.status !== 'ready') return []
    return state.bookings.filter((booking) => !activeStatuses.has(booking.status))
  }, [state])

  async function handleLogout() {
    setIsLoggingOut(true)

    try {
      await logout()
      router.replace('/login')
      router.refresh()
    } catch {
      setState({ status: 'error' })
      setIsLoggingOut(false)
    }
  }

  async function handleAddVehicle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setVehicleError(null)
    setIsAddingVehicle(true)

    try {
      const vehicle = await addVehicle(vehicleName)
      setState((current) =>
        current.status === 'ready'
          ? { ...current, vehicles: [vehicle, ...current.vehicles] }
          : current,
      )
      setVehicleName('')
    } catch (error) {
      setVehicleError(
        error instanceof VehiclesApiError
          ? error.message
          : 'Не удалось добавить автомобиль',
      )
    } finally {
      setIsAddingVehicle(false)
    }
  }

  async function handleRemoveVehicle(id: number) {
    setVehicleError(null)
    setRemovingVehicleId(id)

    try {
      await removeVehicle(id)
      setState((current) =>
        current.status === 'ready'
          ? {
              ...current,
              vehicles: current.vehicles.filter((vehicle) => vehicle.id !== id),
            }
          : current,
      )
    } catch (error) {
      setVehicleError(
        error instanceof VehiclesApiError
          ? error.message
          : 'Не удалось удалить автомобиль',
      )
    } finally {
      setRemovingVehicleId(null)
    }
  }

  async function handleUpdateProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setProfileError(null)
    setProfileMessage(null)
    setIsSavingProfile(true)

    try {
      const { user } = await updateProfile(profileName.trim(), profilePhone.trim())
      setState((current) =>
        current.status === 'ready' ? { ...current, user } : current,
      )
      setProfileName(user.name)
      setProfilePhone(user.phone)
      setProfileMessage('Изменения сохранены')
    } catch (error) {
      setProfileError(
        error instanceof AuthApiError
          ? error.message
          : 'Не удалось сохранить изменения',
      )
    } finally {
      setIsSavingProfile(false)
    }
  }

  if (state.status === 'loading') {
    return (
      <div className="account-loading" role="status">
        <span aria-hidden="true" />
        Загружаем кабинет
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div className="account-message" role="alert">
        <strong>Не удалось загрузить кабинет</strong>
        <p>Проверьте соединение с сервером и попробуйте обновить страницу.</p>
      </div>
    )
  }

  const tabs: Array<{ id: AccountTab; label: string; count?: number }> = [
    { id: 'active', label: 'Активные записи', count: activeBookings.length },
    { id: 'history', label: 'История', count: bookingHistory.length },
    { id: 'garage', label: 'Гараж', count: state.vehicles.length },
    { id: 'profile', label: 'Профиль' },
  ]

  return (
    <section className="account-dashboard">
      <header className="account-dashboard__header">
        <div className="account-dashboard__identity">
          <span aria-hidden="true">{state.user.name.slice(0, 1).toUpperCase()}</span>
          <div>
            <small>Личный кабинет M1</small>
            <h1>{state.user.name}</h1>
            <p>@{state.user.login} · {state.user.phone}</p>
          </div>
        </div>

        <div className="account-dashboard__actions">
          <Link href="/booking">
            Новая запись <span aria-hidden="true">→</span>
          </Link>
          <button type="button" onClick={handleLogout} disabled={isLoggingOut}>
            {isLoggingOut ? 'Выходим…' : 'Выйти'}
          </button>
        </div>
      </header>

      <nav className="account-tabs" aria-label="Разделы личного кабинета">
        {tabs.map((tab) => (
          <button
            className={activeTab === tab.id ? 'is-active' : undefined}
            key={tab.id}
            type="button"
            aria-current={activeTab === tab.id ? 'page' : undefined}
            onClick={() => setActiveTab(tab.id)}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined ? <small>{tab.count}</small> : null}
          </button>
        ))}
      </nav>

      <div className="account-dashboard__panel">
        {activeTab === 'active' ? (
          <section aria-labelledby="active-bookings-title">
            <div className="account-panel-heading">
              <div>
                <small>Предстоящие визиты</small>
                <h2 id="active-bookings-title">Активные записи</h2>
              </div>
              <p>Здесь отображаются записи от ожидания до завершения работ.</p>
            </div>
            <BookingList
              bookings={activeBookings}
              emptyTitle="Активных записей пока нет"
              emptyText="Выберите филиал, услугу и удобное время — запись появится здесь."
              showBookingLink
            />
          </section>
        ) : null}

        {activeTab === 'history' ? (
          <section aria-labelledby="booking-history-title">
            <div className="account-panel-heading">
              <div>
                <small>Прошлые визиты</small>
                <h2 id="booking-history-title">История записей</h2>
              </div>
              <p>Завершённые и отменённые записи сохраняются в одном месте.</p>
            </div>
            <BookingList
              bookings={bookingHistory}
              emptyTitle="История пока пуста"
              emptyText="После завершения или отмены записи она появится в этом разделе."
            />
          </section>
        ) : null}

        {activeTab === 'garage' ? (
          <section aria-labelledby="garage-title">
            <div className="account-panel-heading">
              <div>
                <small>Ваши автомобили</small>
                <h2 id="garage-title">Гараж</h2>
              </div>
              <p>Сохранённый автомобиль можно быстро выбрать при следующей записи.</p>
            </div>

            <div className="account-garage-layout">
              <div>
                {state.vehicles.length > 0 ? (
                  <ul className="account-garage-list">
                    {state.vehicles.map((vehicle) => (
                      <li key={vehicle.id}>
                        <span aria-hidden="true">M1</span>
                        <div>
                          <strong>{vehicle.name}</strong>
                          <small>Сохранён в гараже</small>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveVehicle(vehicle.id)}
                          disabled={removingVehicleId === vehicle.id}
                          aria-label={`Удалить ${vehicle.name} из гаража`}
                        >
                          {removingVehicleId === vehicle.id ? 'Удаляем…' : 'Удалить'}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="account-empty account-empty--compact">
                    <span aria-hidden="true">M1</span>
                    <div>
                      <strong>В гараже пока пусто</strong>
                      <p>Добавьте первый автомобиль с помощью формы.</p>
                    </div>
                  </div>
                )}
              </div>

              <form className="account-garage-form" onSubmit={handleAddVehicle}>
                <small>Новый автомобиль</small>
                <h3>Добавить в гараж</h3>
                <label htmlFor="account-vehicle">Марка, модель и год</label>
                <input
                  id="account-vehicle"
                  type="text"
                  value={vehicleName}
                  onChange={(event) => setVehicleName(event.target.value)}
                  minLength={2}
                  maxLength={120}
                  placeholder="Например, Toyota Camry, 2022"
                  required
                />
                {vehicleError ? <p role="alert">{vehicleError}</p> : null}
                <button type="submit" disabled={isAddingVehicle}>
                  {isAddingVehicle ? 'Добавляем…' : 'Добавить автомобиль'}
                  <span aria-hidden="true">+</span>
                </button>
              </form>
            </div>
          </section>
        ) : null}

        {activeTab === 'profile' ? (
          <section aria-labelledby="profile-title">
            <div className="account-panel-heading">
              <div>
                <small>Личные данные</small>
                <h2 id="profile-title">Профиль</h2>
              </div>
              <p>Имя и телефон автоматически подставляются при онлайн-записи.</p>
            </div>

            <div className="account-profile-layout">
              <form className="account-profile-form" onSubmit={handleUpdateProfile}>
                <label htmlFor="profile-name">
                  <span>Имя</span>
                  <input
                    id="profile-name"
                    type="text"
                    value={profileName}
                    onChange={(event) => setProfileName(event.target.value)}
                    minLength={2}
                    maxLength={80}
                    autoComplete="name"
                    required
                  />
                </label>
                <label htmlFor="profile-phone">
                  <span>Номер телефона</span>
                  <input
                    id="profile-phone"
                    type="tel"
                    value={profilePhone}
                    onChange={(event) => setProfilePhone(event.target.value)}
                    maxLength={24}
                    autoComplete="tel"
                    required
                  />
                </label>
                <label htmlFor="profile-login">
                  <span>Логин</span>
                  <input id="profile-login" value={state.user.login} readOnly />
                  <small>Логин пока нельзя изменить</small>
                </label>
                {profileError ? (
                  <p className="account-profile-form__error" role="alert">
                    {profileError}
                  </p>
                ) : null}
                {profileMessage ? (
                  <p className="account-profile-form__success" role="status">
                    {profileMessage}
                  </p>
                ) : null}
                <button type="submit" disabled={isSavingProfile}>
                  {isSavingProfile ? 'Сохраняем…' : 'Сохранить изменения'}
                  <span aria-hidden="true">→</span>
                </button>
              </form>

              <aside className="account-profile-note">
                <span aria-hidden="true" />
                <small>Как это работает</small>
                <strong>Контакты всегда под рукой</strong>
                <p>
                  При записи из аккаунта повторно вводить имя и телефон не нужно.
                  Backend возьмёт актуальные данные из профиля.
                </p>
              </aside>
            </div>
          </section>
        ) : null}
      </div>
    </section>
  )
}
