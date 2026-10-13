import type { ServiceSummary, StationSummary } from './catalog-api'

export type ServiceStationOffer = StationSummary & {
  durationMinutes: number
  priceFrom: number
}

export type ServiceDetails = Pick<
  ServiceSummary,
  'id' | 'slug' | 'name' | 'description' | 'category'
> & {
  stations: ServiceStationOffer[]
}

export type AvailabilitySlot = {
  startsAt: string
  endsAt: string
}

export type AvailabilityResponse = {
  stationId: number
  serviceId: number
  date: string
  timezone: string
  durationMinutes: number
  slotStepMinutes: number
  slots: AvailabilitySlot[]
}

export type CreateBookingPayload = {
  stationId: number
  serviceId: number
  startsAt: string
  customerName?: string
  phone?: string
  vehicle?: string
  vehicleId?: number
}

export type BookingStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'

export type CreatedBooking = {
  id: number
  stationId: number
  serviceId: number
  vehicleId: number | null
  customerName: string
  phone: string
  vehicle: string
  startsAt: string
  endsAt: string
  durationMinutes: number
  priceAmount: number | null
  status: BookingStatus
  createdAt: string
}

export type UserBooking = {
  id: number
  vehicle: string
  startsAt: string
  endsAt: string
  durationMinutes: number
  priceAmount: number | null
  status: BookingStatus
  createdAt: string
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
}

type ApiErrorBody = {
  message?: string | string[]
}

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api'

export class BookingApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
    this.name = 'BookingApiError'
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

    throw new BookingApiError(
      message ?? 'Не удалось выполнить запрос',
      response.status,
    )
  }

  return response.json() as Promise<T>
}

export function getServiceDetails(serviceId: number, signal?: AbortSignal) {
  return request<ServiceDetails>(`/services/${serviceId}`, { signal })
}

export function getAvailability(
  stationId: number,
  serviceId: number,
  date: string,
  signal?: AbortSignal,
) {
  const query = new URLSearchParams({
    stationId: String(stationId),
    serviceId: String(serviceId),
    date,
  })

  return request<AvailabilityResponse>(`/availability?${query}`, { signal })
}

export function createBooking(payload: CreateBookingPayload) {
  return request<CreatedBooking>('/bookings', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function getMyBookings() {
  return request<UserBooking[]>('/bookings/me')
}
