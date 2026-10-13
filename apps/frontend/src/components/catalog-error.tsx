type CatalogErrorProps = {
  message?: string
}

export function CatalogError({
  message = 'Не удалось получить данные. Попробуйте обновить страницу позже.',
}: CatalogErrorProps) {
  return (
    <div className="catalog-message catalog-message--error" role="alert">
      <span aria-hidden="true">!</span>
      <div>
        <strong>Каталог временно недоступен</strong>
        <p>{message}</p>
      </div>
    </div>
  )
}
