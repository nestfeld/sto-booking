'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { type FormEvent, useEffect, useMemo, useState } from 'react'
import {
  AdminApiError,
  getAdminBookings,
  getAdminStations,
  updateAdminBookingStatus,
  type AdminBooking,
} from '@/lib/admin-api'
import { AuthApiError, getCurrentUser, logout, type AuthUser } from '@/lib/auth-api'
import type { BookingStatus } from '@/lib/booking-api'
import type { StationSummary } from '@/lib/catalog-api'

type AdminState =
  | { status: 'loading' }
  | {
      status: 'ready'
      user: AuthUser
      bookings: AdminBooking[]
      stations: StationSummary[]
    }
  | { status: 'error'; message: string }

const statusLabels: Record<BookingStatus, string> = {
  PENDING: 'Ожидает',
  CONFIRMED: 'Подтверждена',
  IN_PROGRESS: 'В работе',
  COMPLETED: 'Завершена',
  CANCELLED: 'Отменена',
}

const transitions: Record<
  BookingStatus,
  Array<{ status: BookingStatus; label: string; danger?: boolean }>
> = {
  PENDING: [
    { status: 'CONFIRMED', label: 'Подтвердить' },
    { status: 'CANCELLED', label: 'Отменить', danger: true },
  ],
  CONFIRMED: [
    { status: 'IN_PROGRESS', label: 'Начать работы' },
    { status: 'CANCELLED', label: 'Отменить', danger: true },
  ],
  IN_PROGRESS: [{ status: 'COMPLETED', label: 'Завершить' }],
  COMPLETED: [],
  CANCELLED: [],
}

const priceFormatter = new Intl.NumberFormat('ru-RU')

function formatVisitDate(booking: AdminBooking) {
  return new Intl.DateTimeFormat('ru-RU', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: booking.station.timezone,
  }).format(new Date(booking.startsAt))
}

function dateRange(value: string) {
  if (!value) return {}

  const from = new Date(`${value}T00:00:00`)
  const to = new Date(from)
  to.setDate(to.getDate() + 1)

  return { from: from.toISOString(), to: to.toISOString() }
}

export function AdminDashboard() {
  const router = useRouter()
  const [state, setState] = useState<AdminState>({ status: 'loading' })
  const [statusFilter, setStatusFilter] = useState<BookingStatus | ''>('')
  const [stationFilter, setStationFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [isFiltering, setIsFiltering] = useState(false)
  const [filterError, setFilterError] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<number | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  useEffect(() => {
    let isMounted = true

    getCurrentUser()
      .then(async ({ user }) => {
        if (user.role !== 'ADMIN') {
          router.replace('/account')
          return
        }

        const [bookings, stations] = await Promise.all([
          getAdminBookings(),
          getAdminStations(),
        ])

        if (isMounted) {
          setState({ status: 'ready', user, bookings, stations })
        }
      })
      .catch((error: unknown) => {
        if (!isMounted) return

        if (
          (error instanceof AuthApiError || error instanceof AdminApiError) &&
          error.status === 401
        ) {
          router.replace('/login')
          return
        }

        if (error instanceof AdminApiError && error.status === 403) {
          router.replace('/account')
          return
        }

        setState({
          status: 'error',
          message:
            error instanceof Error
              ? error.message
              : 'Не удалось загрузить административную панель',
        })
      })

    return () => {
      isMounted = false
    }
  }, [router])

  const metrics = useMemo(() => {
    if (state.status !== 'ready') return null

    return {
      total: state.bookings.length,
      pending: state.bookings.filter((booking) => booking.status === 'PENDING').length,
      confirmed: state.bookings.filter((booking) => booking.status === 'CONFIRMED').length,
      inProgress: state.bookings.filter((booking) => booking.status === 'IN_PROGRESS').length,
    }
  }, [state])

  async function loadBookings(filters?: {
    status?: BookingStatus
    stationId?: number
    from?: string
    to?: string
  }) {
    const bookings = await getAdminBookings(filters)
    setState((current) =>
      current.status === 'ready' ? { ...current, bookings } : current,
    )
  }

  async function handleFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFilterError(null)
    setIsFiltering(true)

    try {
      await loadBookings({
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(stationFilter ? { stationId: Number(stationFilter) } : {}),
        ...dateRange(dateFilter),
      })
    } catch (error) {
      setFilterError(
        error instanceof AdminApiError
          ? error.message
          : 'Не удалось применить фильтры',
      )
    } finally {
      setIsFiltering(false)
    }
  }

  async function clearFilters() {
    setStatusFilter('')
    setStationFilter('')
    setDateFilter('')
    setFilterError(null)
    setIsFiltering(true)

    try {
      await loadBookings()
    } catch (error) {
      setFilterError(
        error instanceof AdminApiError
          ? error.message
          : 'Не удалось обновить список',
      )
    } finally {
      setIsFiltering(false)
    }
  }

  async function handleStatus(id: number, status: BookingStatus) {
    setActionError(null)
    setUpdatingId(id)

    try {
      const booking = await updateAdminBookingStatus(id, status)
      setState((current) =>
        current.status === 'ready'
          ? {
              ...current,
              bookings: current.bookings.map((item) =>
                item.id === booking.id ? booking : item,
              ),
            }
          : current,
      )
    } catch (error) {
      setActionError(
        error instanceof AdminApiError
          ? error.message
          : 'Не удалось изменить статус записи',
      )
    } finally {
      setUpdatingId(null)
    }
  }

  async function handleLogout() {
    setIsLoggingOut(true)

    try {
      await logout()
      router.replace('/login')
      router.refresh()
    } catch {
      setIsLoggingOut(false)
      setActionError('Не удалось выйти из аккаунта')
    }
  }

  if (state.status === 'loading') {
    return (
      <div className="admin-loading" role="status">
        <span aria-hidden="true" />
        Загружаем записи
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div className="admin-message" role="alert">
        <strong>Не удалось открыть панель</strong>
        <p>{state.message}</p>
      </div>
    )
  }

  return (
    <section className="admin-dashboard">
      <header className="admin-dashboard__header">
        <div>
          <small>Управление сетью M1</small>
          <h1>Записи клиентов</h1>
          <p>Администратор: {state.user.name}</p>
        </div>
        <div>
          <Link href="/">Открыть сайт</Link>
          <button type="button" onClick={handleLogout} disabled={isLoggingOut}>
            {isLoggingOut ? 'Выходим…' : 'Выйти'}
          </button>
        </div>
      </header>

      <div className="admin-metrics" aria-label="Сводка записей">
        <article>
          <span>01</span>
          <strong>{metrics?.pending ?? 0}</strong>
          <small>Ожидают решения</small>
        </article>
        <article>
          <span>02</span>
          <strong>{metrics?.confirmed ?? 0}</strong>
          <small>Подтверждены</small>
        </article>
        <article>
          <span>03</span>
          <strong>{metrics?.inProgress ?? 0}</strong>
          <small>Сейчас в работе</small>
        </article>
        <article>
          <span>04</span>
          <strong>{metrics?.total ?? 0}</strong>
          <small>В текущем списке</small>
        </article>
      </div>

      <form className="admin-filters" onSubmit={handleFilters}>
        <label>
          <span>Статус</span>
          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as BookingStatus | '')
            }
          >
            <option value="">Все статусы</option>
            {Object.entries(statusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Филиал</span>
          <select
            value={stationFilter}
            onChange={(event) => setStationFilter(event.target.value)}
          >
            <option value="">Все филиалы</option>
            {state.stations.map((station) => (
              <option key={station.id} value={station.id}>
                {station.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Дата визита</span>
          <input
            type="date"
            value={dateFilter}
            onChange={(event) => setDateFilter(event.target.value)}
          />
        </label>
        <button type="submit" disabled={isFiltering}>
          {isFiltering ? 'Обновляем…' : 'Применить'}
        </button>
        <button type="button" onClick={clearFilters} disabled={isFiltering}>
          Сбросить
        </button>
        {filterError ? <p role="alert">{filterError}</p> : null}
      </form>

      <div className="admin-bookings-heading">
        <div>
          <small>Рабочая очередь</small>
          <h2>Все записи</h2>
        </div>
        <span>{state.bookings.length}</span>
      </div>

      {actionError ? (
        <p className="admin-action-error" role="alert">
          {actionError}
        </p>
      ) : null}

      {state.bookings.length === 0 ? (
        <div className="admin-empty">
          <span aria-hidden="true">M1</span>
          <strong>По выбранным условиям записей нет</strong>
          <p>Измените фильтры или дождитесь новых онлайн-записей.</p>
        </div>
      ) : (
        <div className="admin-bookings">
          {state.bookings.map((booking) => (
            <article className="admin-booking-card" key={booking.id}>
              <div className="admin-booking-card__topline">
                <span data-status={booking.status}>{statusLabels[booking.status]}</span>
                <small>№ {String(booking.id).padStart(4, '0')}</small>
              </div>

              <div className="admin-booking-card__title">
                <div>
                  <h3>{booking.service.name}</h3>
                  <time dateTime={booking.startsAt}>{formatVisitDate(booking)}</time>
                </div>
                <strong>
                  {booking.priceAmount === null
                    ? 'Цена уточняется'
                    : `от ${priceFormatter.format(booking.priceAmount)} ₸`}
                </strong>
              </div>

              <dl>
                <div>
                  <dt>Клиент</dt>
                  <dd>{booking.customerName}</dd>
                  <dd>{booking.phone}</dd>
                </div>
                <div>
                  <dt>Автомобиль</dt>
                  <dd>{booking.vehicle}</dd>
                  <dd>{booking.user ? `@${booking.user.login}` : 'Без аккаунта'}</dd>
                </div>
                <div>
                  <dt>Филиал</dt>
                  <dd>{booking.station.name}</dd>
                  <dd>{booking.station.address}</dd>
                </div>
                <div>
                  <dt>Рабочий пост</dt>
                  <dd>{booking.workPost.name}</dd>
                  <dd>{booking.workPost.code}</dd>
                </div>
              </dl>

              <div className="admin-booking-card__actions">
                {transitions[booking.status].length > 0 ? (
                  transitions[booking.status].map((action) => (
                    <button
                      className={action.danger ? 'is-danger' : undefined}
                      key={action.status}
                      type="button"
                      disabled={updatingId === booking.id}
                      onClick={() => handleStatus(booking.id, action.status)}
                    >
                      {updatingId === booking.id ? 'Сохраняем…' : action.label}
                    </button>
                  ))
                ) : (
                  <span>Статус завершён</span>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
