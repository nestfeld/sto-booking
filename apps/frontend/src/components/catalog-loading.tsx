import { SiteLayout } from './site-layout'

type CatalogLoadingProps = {
  label: string
}

export function CatalogLoading({ label }: CatalogLoadingProps) {
  return (
    <SiteLayout>
      <div className="catalog-loading" role="status">
        <span className="catalog-loading__dot" aria-hidden="true" />
        {label}
      </div>
    </SiteLayout>
  )
}
