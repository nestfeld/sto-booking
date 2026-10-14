type SiteFooterProps = {
  note?: string
}

export function SiteFooter({ note = 'Онлайн-запись без звонков' }: SiteFooterProps) {
  return (
    <footer className="site-footer">
      <span>M1 Сервис</span>
      <span>{note}</span>
    </footer>
  )
}
