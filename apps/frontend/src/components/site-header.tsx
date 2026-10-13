import Link from 'next/link'
import { BrandLogo } from './brand-logo'
import { HeaderAccount } from './header-account'

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link href="/" aria-label="M1 Сервис — главная">
        <BrandLogo />
      </Link>

      <nav className="site-nav" aria-label="Основная навигация">
        <Link href="/services">Услуги</Link>
        <Link href="/stations">Наши СТО</Link>
        <Link href="/#contacts">Контакты</Link>
      </nav>

      <div className="header-actions">
        <Link className="header-action" href="/booking">
          Записаться
        </Link>
        <HeaderAccount />
      </div>
    </header>
  )
}
