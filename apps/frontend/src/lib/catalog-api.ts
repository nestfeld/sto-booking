export type ServiceSummary = {
  id: number
  slug: string
  name: string
  description: string
  category: string
  durationMinutes: number
  priceFrom: number
  stationCount: number
}

export type StationSummary = {
  id: number
  slug: string
  name: string
  address: string
  phone: string | null
  timezone: string
  serviceCount: number
}

const apiUrl =
  process.env.API_INTERNAL_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  'http://localhost:5000/api'

async function request<T>(path: string): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`, {
    next: { revalidate: 60 },
  })

  if (!response.ok) {
    throw new Error(`Catalog API returned ${response.status}`)
  }

  return response.json() as Promise<T>
}

export function getServices(): Promise<ServiceSummary[]> {
  return request<ServiceSummary[]>('/services')
}

export function getStations(): Promise<StationSummary[]> {
  return request<StationSummary[]>('/stations')
}
