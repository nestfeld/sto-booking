# M1 Сервис — frontend

Клиентская часть проекта на Next.js с App Router и TypeScript.

Из корня monorepo development-окружение запускается командой:

```bash
docker compose -f compose.dev.yaml up -d --build
```

Frontend будет доступен по адресу `http://localhost:3000`. Изменения в `src`
подхватываются Next.js Fast Refresh.

## Структура компонентов

Страницы App Router отвечают за загрузку данных и собираются из переиспользуемых
React-компонентов:

- `SiteLayout`, `SiteHeader`, `SiteFooter` — общий каркас страниц;
- `Eyebrow`, `SectionHeading` — единая типографика заголовков;
- `CatalogGrid`, `CatalogCard` — общая сетка, состояния и основа карточек;
- `ServiceCard`, `StationCard` — адаптеры данных услуг и СТО;
- `HeroSection`, `BookingPreview` — самостоятельные секции главной страницы.
