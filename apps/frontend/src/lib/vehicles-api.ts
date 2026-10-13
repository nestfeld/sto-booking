export type Vehicle = {
  id: number
  name: string
  createdAt: string
}

type ApiErrorBody = {
  message?: string | string[]
}

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api'

export class VehiclesApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
    this.name = 'VehiclesApiError'
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

    throw new VehiclesApiError(
      message ?? 'Не удалось выполнить запрос',
      response.status,
    )
  }

  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export function getVehicles() {
  return request<Vehicle[]>('/vehicles')
}

export function addVehicle(name: string) {
  return request<Vehicle>('/vehicles', {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
}

export function removeVehicle(id: number) {
  return request<void>(`/vehicles/${id}`, { method: 'DELETE' })
}
