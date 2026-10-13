import { useEffect, useState } from 'react'
import './App.css'

type Health = {
  status: string
  service: string
  database: string
}

function App() {
  const [health, setHealth] = useState<Health | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api'

    fetch(`${apiUrl}/health`)
      .then((response) => {
        if (!response.ok) throw new Error('Backend is unavailable')
        return response.json() as Promise<Health>
      })
      .then(setHealth)
      .catch(() => setError(true))
  }, [])

  return (
    <main>
      <section className="card">
        <span className="eyebrow">СТО Онлайн</span>
        <h1>Запись на обслуживание</h1>
        <p className="lead">
          Рабочее окружение React, NestJS, Prisma и PostgreSQL готово к разработке.
        </p>
        <div className={`status ${health ? 'online' : error ? 'offline' : ''}`}>
          <span className="dot" aria-hidden="true" />
          {health
            ? `Backend доступен · PostgreSQL ${health.database}`
            : error
              ? 'Backend недоступен'
              : 'Проверяем сервисы…'}
        </div>
      </section>
    </main>
  )
}

export default App
