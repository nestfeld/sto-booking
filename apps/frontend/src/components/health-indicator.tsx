'use client'

import { useEffect, useState } from 'react'

type Health = {
  status: string
  service: string
  database: string
}

type ConnectionState = 'checking' | 'online' | 'offline'

export function HealthIndicator() {
  const [state, setState] = useState<ConnectionState>('checking')

  useEffect(() => {
    const controller = new AbortController()
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api'

    async function checkHealth() {
      try {
        const response = await fetch(`${apiUrl}/health`, {
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error('Backend is unavailable')
        }

        const health = (await response.json()) as Health
        setState(health.status === 'ok' ? 'online' : 'offline')
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return
        setState('offline')
      }
    }

    void checkHealth()

    return () => controller.abort()
  }, [])

  const label = {
    checking: 'Проверяем систему',
    online: 'Система готова',
    offline: 'Система недоступна',
  }[state]

  return (
    <span className={`health health--${state}`} role="status">
      <span className="health__dot" aria-hidden="true" />
      {label}
    </span>
  )
}
