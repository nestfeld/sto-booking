export type AuthUser = {
  id: number
  login: string
  name: string
  phone: string
  role: 'CLIENT' | 'ADMIN'
  createdAt: string
}

type AuthResponse = {
  user: AuthUser
}

type ApiErrorBody = {
  message?: string | string[]
}

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api'
const authenticatedCacheLifetime = 60_000
const anonymousCacheLifetime = 5_000

let currentUserRequest: Promise<AuthResponse> | null = null
let currentUserExpiresAt = 0

export class AuthApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
    this.name = 'AuthApiError'
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ApiErrorBody
    const message = Array.isArray(body.message)
      ? body.message.join('. ')
      : body.message

    throw new AuthApiError(message ?? 'Не удалось выполнить запрос', response.status)
  }

  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export function register(login: string, password: string, name: string, phone: string) {
  const registration = request<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ login, password, name, phone }),
  })

  currentUserExpiresAt = Number.POSITIVE_INFINITY
  currentUserRequest = registration
    .then((response) => {
      currentUserExpiresAt = Date.now() + authenticatedCacheLifetime
      return response
    })
    .catch((error: unknown) => {
      currentUserRequest = null
      currentUserExpiresAt = 0
      throw error
    })

  return currentUserRequest
}

export function login(loginValue: string, password: string) {
  const authentication = request<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ login: loginValue, password }),
  })

  currentUserExpiresAt = Number.POSITIVE_INFINITY
  currentUserRequest = authentication
    .then((response) => {
      currentUserExpiresAt = Date.now() + authenticatedCacheLifetime
      return response
    })
    .catch((error: unknown) => {
      currentUserRequest = null
      currentUserExpiresAt = 0
      throw error
    })

  return currentUserRequest
}

export function getCurrentUser() {
  if (currentUserRequest && Date.now() < currentUserExpiresAt) {
    return currentUserRequest
  }

  currentUserExpiresAt = Number.POSITIVE_INFINITY
  currentUserRequest = request<AuthResponse>('/auth/me')
    .then((response) => {
      currentUserExpiresAt = Date.now() + authenticatedCacheLifetime
      return response
    })
    .catch((error: unknown) => {
      if (error instanceof AuthApiError && error.status === 401) {
        currentUserExpiresAt = Date.now() + anonymousCacheLifetime
      } else {
        currentUserRequest = null
        currentUserExpiresAt = 0
      }

      throw error
    })

  return currentUserRequest
}

export function updateProfile(name: string, phone: string) {
  const update = request<AuthResponse>('/auth/profile', {
    method: 'PATCH',
    body: JSON.stringify({ name, phone }),
  })

  currentUserExpiresAt = Number.POSITIVE_INFINITY
  currentUserRequest = update
    .then((response) => {
      currentUserExpiresAt = Date.now() + authenticatedCacheLifetime
      return response
    })
    .catch((error: unknown) => {
      currentUserRequest = null
      currentUserExpiresAt = 0
      throw error
    })

  return currentUserRequest
}

export async function logout() {
  try {
    await request<void>('/auth/logout', { method: 'POST' })
  } finally {
    currentUserRequest = null
    currentUserExpiresAt = 0
  }
}
