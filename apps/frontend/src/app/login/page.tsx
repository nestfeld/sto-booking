import type { Metadata } from 'next'
import { AuthForm } from '@/components/auth-form'
import { Eyebrow } from '@/components/eyebrow'
import { SiteLayout } from '@/components/site-layout'

// Next.js expects metadata to live beside the page component.
// oxlint-disable-next-line react/only-export-components
export const metadata: Metadata = {
  title: 'Вход — M1 Сервис',
  description: 'Вход и регистрация в личном кабинете M1 Сервис',
}

export default function LoginPage() {
  return (
    <SiteLayout footerNote="Личный кабинет M1">
      <section className="auth-page">
        <div className="auth-intro">
          <Eyebrow>Личный кабинет</Eyebrow>
          <h1>
            Ваш сервис.
            <span>Всегда рядом.</span>
          </h1>
          <p>
            Войдите, чтобы перейти в кабинет, или создайте аккаунт. Для обычной
            онлайн-записи регистрация не обязательна.
          </p>
          <dl>
            <div>
              <dt>01</dt>
              <dd>Один логин для сети M1</dd>
            </div>
            <div>
              <dt>02</dt>
              <dd>Пароль хранится только в виде хеша</dd>
            </div>
          </dl>
        </div>

        <AuthForm />
      </section>
    </SiteLayout>
  )
}
