import type { Metadata } from 'next'
import { AccountPanel } from '@/components/account-panel'
import { SiteLayout } from '@/components/site-layout'

// Next.js expects metadata to live beside the page component.
// oxlint-disable-next-line react/only-export-components
export const metadata: Metadata = {
  title: 'Личный кабинет — M1 Сервис',
  description: 'Личный кабинет клиента M1 Сервис',
}

export default function AccountPage() {
  return (
    <SiteLayout footerNote="Личный кабинет M1">
      <AccountPanel />
    </SiteLayout>
  )
}
