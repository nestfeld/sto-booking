'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { getCurrentUser, type AuthUser } from '@/lib/auth-api'

export function HeaderAccount() {
  const [user, setUser] = useState<AuthUser | null | undefined>(undefined)

  useEffect(() => {
    let isMounted = true

    getCurrentUser()
      .then(({ user: currentUser }) => {
        if (isMounted) setUser(currentUser)
      })
      .catch(() => {
        if (isMounted) setUser(null)
      })

    return () => {
      isMounted = false
    }
  }, [])

  if (user === undefined) {
    return (
      <span
        className="header-account-loading"
        role="status"
        aria-label="Проверяем авторизацию"
      />
    )
  }

  if (user) {
    const initial = user.name.slice(0, 1).toUpperCase()

    return (
      <Link
        className="header-avatar"
        href={user.role === 'ADMIN' ? '/admin' : '/account'}
        aria-label={
          user.role === 'ADMIN'
            ? `Панель администратора: ${user.name}`
            : `Личный кабинет: ${user.name}`
        }
        title={user.name}
      >
        {initial}
      </Link>
    )
  }

  return (
    <Link className="header-login" href="/login">
      Войти
    </Link>
  )
}
