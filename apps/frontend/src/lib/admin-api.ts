import type { BookingStatus } from './booking-api'
import type { StationSummary } from './catalog-api'

export type AdminBooking = {
  id: number
  userId: number | null
  customerName: string
  phone: string
  vehicle: string
  startsAt: string
  endsAt: string
  durationMinutes: number
  priceAmount: number | null
  status: BookingStatus
  createdAt: string
  updatedAt: string
  user: {
    id: number
    login: string
    name: string
    phone: string
  } | null
  station: {
    id: number
    name: string
    address: string
    timezone: string
  }
  service: {
    id: number
    name: string
  }
  workPost: {
    id: number
    code: string
    name: string
  }
}

export type AdminBookingFilters = {
  status?: BookingStatus
  stationId?: number
  from?: string
  to?: string
}

type ApiErrorBody = {
  message?: string | string[]
}

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api'

export class AdminApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
    this.name = 'AdminApiError'
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    credentials: 'include',
    headers: init?.body
      ? { 'Content-Type': 'application/json', ...init.headers }
      : init?.headers,
  })

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ApiErrorBody
    const message = Array.isArray(body.message)
      ? body.message.join('. ')
      : body.message

    throw new AdminApiError(
      message ?? 'Не удалось выполнить административный запрос',
      response.status,
    )
  }

  return response.json() as Promise<T>
}

export function getAdminBookings(filters: AdminBookingFilters = {}) {
  const query = new URLSearchParams()

  if (filters.status) query.set('status', filters.status)
  if (filters.stationId) query.set('stationId', String(filters.stationId))
  if (filters.from) query.set('from', filters.from)
  if (filters.to) query.set('to', filters.to)

  const suffix = query.size > 0 ? `?${query}` : ''
  return request<AdminBooking[]>(`/admin/bookings${suffix}`)
}

export function getAdminBooking(id: number) {
  return request<AdminBooking>(`/admin/bookings/${id}`)
}

export function updateAdminBookingStatus(id: number, status: BookingStatus) {
  return request<AdminBooking>(`/admin/bookings/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
}

export function getAdminStations() {
  return request<StationSummary[]>('/stations')
}
