# STO Booking

Стартовое monorepo для сервиса онлайн-записи в СТО.

## Стек

- React + TypeScript + Vite
- NestJS
- PostgreSQL
- Prisma ORM
- Docker Compose

Node.js и PostgreSQL запускаются только в Docker. Глобальная установка в Windows не требуется.

## Запуск

1. Создайте локальный файл окружения:

   ```powershell
   Copy-Item .env.example .env
   ```

2. Замените `POSTGRES_PASSWORD` в `.env` на собственный пароль.

3. Соберите и запустите сервисы:

   ```powershell
   docker compose up -d --build
   ```

4. Проверьте состояние:

   ```powershell
   docker compose ps
   Invoke-RestMethod http://localhost:5000/api/health
   ```

После запуска доступны:

- Frontend: http://localhost:3000
- Backend health-check: http://localhost:5000/api/health
- PostgreSQL доступен только сервисам во внутренней сети Compose.

При старте backend автоматически выполняет `prisma migrate deploy`. Данные PostgreSQL сохраняются в именованном томе `sto-booking-postgres-data`.

## Полезные команды

```powershell
# Логи всех сервисов
docker compose logs -f

# Пересобрать и перезапустить
docker compose up -d --build

# Остановить контейнеры без удаления данных
docker compose down

# Остановить и удалить также PostgreSQL volume
docker compose down --volumes
```

## Структура

```text
sto-booking/
├── apps/
│   ├── frontend/        # React + Vite, отдаётся через nginx
│   └── backend/         # NestJS + Prisma
├── compose.yaml
├── compose.dev.yaml     # Vite HMR + NestJS watch
├── package.json         # npm workspaces
├── .env.example
└── README.md
```

Файл `.env` исключён из Git. Коммитить его нельзя; для репозитория хранится только безопасный шаблон `.env.example`.

## Режим разработки с автоматическим обновлением

Development Compose запускает Vite с HMR и NestJS в watch-режиме. Изменения в `apps/frontend/src` и `apps/backend/src` сразу передаются в контейнеры через bind mounts.

Production и development используют одинаковые порты, поэтому сначала остановите обычный стек:

```powershell
docker compose down
docker compose -f compose.dev.yaml up -d --build
```

Логи development-сервисов:

```powershell
docker compose -f compose.dev.yaml logs -f frontend backend
```

Остановка development-стека без удаления базы данных:

```powershell
docker compose -f compose.dev.yaml down
```

После изменения зависимостей в `package.json` пересоберите образы:

```powershell
docker compose -f compose.dev.yaml up -d --build
```

Изменения Prisma-схемы не мигрируются автоматически. Новую миграцию можно создать внутри backend-контейнера:

```powershell
docker compose -f compose.dev.yaml exec backend npm exec prisma migrate dev -- --name migration_name
```

Development использует отдельный volume `sto-booking-dev-postgres-data`; production-данные не затрагиваются.
