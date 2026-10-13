'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FormEvent, useState } from 'react'
import { AuthApiError, login, register } from '@/lib/auth-api'

type AuthMode = 'login' | 'register'

export function AuthForm() {
  const router = useRouter()
  const [mode, setMode] = useState<AuthMode>('login')
  const [loginValue, setLoginValue] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      let destination = '/account'

      if (mode === 'login') {
        const { user } = await login(loginValue, password)
        if (user.role === 'ADMIN') destination = '/admin'
      } else {
        await register(loginValue, password, name, phone)
      }
      router.replace(destination)
      router.refresh()
    } catch (requestError) {
      setError(
        requestError instanceof AuthApiError
          ? requestError.message
          : 'Не удалось связаться с сервером',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  function selectMode(nextMode: AuthMode) {
    setMode(nextMode)
    setError(null)
  }

  return (
    <article className="auth-card">
      <div className="auth-card__tabs" role="tablist" aria-label="Авторизация">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'login'}
          className={mode === 'login' ? 'is-active' : undefined}
          onClick={() => selectMode('login')}
        >
          Вход
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'register'}
          className={mode === 'register' ? 'is-active' : undefined}
          onClick={() => selectMode('register')}
        >
          Регистрация
        </button>
      </div>

      <div className="auth-card__heading">
        <span>{mode === 'login' ? 'С возвращением' : 'Новый клиент'}</span>
        <h2>{mode === 'login' ? 'Войдите в кабинет' : 'Создайте аккаунт'}</h2>
        <p>
          {mode === 'login'
            ? 'Используйте логин и пароль, указанные при регистрации.'
            : 'Регистрация займёт меньше минуты. Записаться можно и без аккаунта.'}
        </p>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        {mode === 'register' ? (
          <>
            <label>
              <span>Ваше имя</span>
              <input
                type="text"
                name="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                minLength={2}
                maxLength={80}
                autoComplete="name"
                placeholder="например, Алексей"
                required
              />
            </label>

            <label>
              <span>Телефон</span>
              <input
                type="tel"
                name="phone"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                maxLength={24}
                autoComplete="tel"
                placeholder="+7 700 000 00 00"
                required
              />
            </label>
          </>
        ) : null}

        <label>
          <span>Логин</span>
          <input
            type="text"
            name="login"
            value={loginValue}
            onChange={(event) => setLoginValue(event.target.value)}
            minLength={3}
            maxLength={32}
            autoComplete="username"
            placeholder="например, alex.auto"
            required
          />
        </label>

        <label>
          <span>Пароль</span>
          <input
            type="password"
            name="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={8}
            maxLength={64}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            placeholder="не менее 8 символов"
            required
          />
        </label>

        {error ? (
          <p className="auth-form__error" role="alert">
            {error}
          </p>
        ) : null}

        <button className="auth-submit" type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? 'Подождите…'
            : mode === 'login'
              ? 'Войти'
              : 'Создать аккаунт'}
          <span aria-hidden="true">→</span>
        </button>
      </form>

      <Link className="auth-card__booking-link" href="/booking">
        Продолжить без регистрации
        <span aria-hidden="true">↗</span>
      </Link>
    </article>
  )
}
