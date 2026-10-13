import type { Metadata } from 'next'
import { AdminDashboard } from '@/components/admin-dashboard'
import { SiteLayout } from '@/components/site-layout'

// Next.js expects metadata to live beside the page component.
// oxlint-disable-next-line react/only-export-components
export const metadata: Metadata = {
  title: 'Управление записями — M1 Сервис',
  description: 'Административная панель сети M1 Сервис',
}

export default function AdminPage() {
  return (
    <SiteLayout footerNote="Панель администратора M1">
      <AdminDashboard />
    </SiteLayout>
  )
}
