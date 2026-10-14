# STO Booking

Стартовое monorepo для сервиса онлайн-записи в СТО.

## Стек

- Next.js (App Router) + React + TypeScript
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
- Каталог услуг: http://localhost:5000/api/services
- Каталог СТО: http://localhost:5000/api/stations
- Свободное время: `GET http://localhost:5000/api/availability?stationId=1&serviceId=1&date=2026-10-14`
- Создание записи: `POST http://localhost:5000/api/bookings`
- Регистрация: `POST http://localhost:5000/api/auth/register`
- Вход: `POST http://localhost:5000/api/auth/login`
- Текущий пользователь: `GET http://localhost:5000/api/auth/me`
- Изменение имени и телефона: `PATCH http://localhost:5000/api/auth/profile`
- Выход: `POST http://localhost:5000/api/auth/logout`
- Записи текущего пользователя: `GET http://localhost:5000/api/bookings/me`
- Автомобили пользователя: `GET/POST http://localhost:5000/api/vehicles`, удаление — `DELETE http://localhost:5000/api/vehicles/:id`
- Список записей для администратора: `GET http://localhost:5000/api/admin/bookings`
- Детали записи для администратора: `GET http://localhost:5000/api/admin/bookings/:id`
- Изменение статуса: `PATCH http://localhost:5000/api/admin/bookings/:id/status`
- PostgreSQL доступен только сервисам во внутренней сети Compose.

Пример тела запроса для создания записи:

```json
{
  "stationId": 1,
  "serviceId": 1,
  "startsAt": "2026-10-14T09:00:00+05:00",
  "customerName": "Иван Петров",
  "phone": "+7 700 000 00 00",
  "vehicle": "Toyota Camry"
}
```

Backend повторно проверяет доступность времени, сам выбирает подходящий рабочий пост и создаёт запись со статусом `PENDING`. Авторизация необязательна; если клиент вошёл в аккаунт, запись автоматически связывается с ним.

При регистрации обязательны `login`, `password`, `name` и `phone`. Формат номера
телефона пока не проверяется. Авторизованный клиент не передаёт имя и телефон в
бронировании: backend берёт их из профиля. Для сохранённого автомобиля достаточно
передать `vehicleId`; новый автомобиль можно передать обычным полем `vehicle`.

При старте backend автоматически выполняет `prisma migrate deploy` и идемпотентный
seed. Данные PostgreSQL сохраняются в именованном томе
`sto-booking-postgres-data`.

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
│   ├── frontend/        # Next.js App Router
│   └── backend/         # NestJS + Prisma
├── compose.yaml
├── compose.dev.yaml     # Next.js Fast Refresh + NestJS watch
├── compose.coolify.yaml # production-развёртывание через Coolify
├── package.json         # npm workspaces
├── .env.example
└── README.md
```

Файл `.env` исключён из Git. Коммитить его нельзя; для репозитория хранится только безопасный шаблон `.env.example`.

Для авторизации задайте в `.env` случайный `JWT_SECRET` длиной не менее 32
символов. В локальной разработке `COOKIE_SECURE=false`; при публикации через
HTTPS установите `COOKIE_SECURE=true`.

## Авторизация клиента

Страницы frontend:

- http://localhost:3000/login — вход и регистрация;
- http://localhost:3000/account — личный кабинет.

JWT хранится в `HttpOnly` cookie `m1_session` и недоступен клиентскому
JavaScript. Пароли хранятся в PostgreSQL только в виде bcrypt-хеша. Регистрация
не обязательна для онлайн-записи. В кабинете пользователь может отдельно
управлять гаражом, активными и прошлыми записями, а также изменять имя и телефон.
Созданная после входа запись автоматически связывается с аккаунтом.

## Административная панель

Страница администратора доступна по адресу http://localhost:3000/admin. Она
показывает записи клиентов, контактные данные, автомобиль, услугу, филиал и
автоматически назначенный рабочий пост. Список можно фильтровать по статусу,
филиалу и датам.

Публичная регистрация всегда создаёт пользователя с ролью `CLIENT`. Учётная
запись администратора создаётся или обновляется только seed-скриптом. Для этого
задайте в локальном `.env` все четыре переменные:

```dotenv
ADMIN_LOGIN=m1.admin
ADMIN_PASSWORD=replace-with-a-strong-password
ADMIN_NAME=Администратор M1
ADMIN_PHONE=+7 700 000 00 00
```

Если переменные оставлены пустыми, seed пропускает создание администратора. Не
добавляйте реальные логины и пароли в `.env.example` или Git.

Для записей разрешены только последовательные переходы статусов:

- `PENDING` → `CONFIRMED` или `CANCELLED`;
- `CONFIRMED` → `IN_PROGRESS` или `CANCELLED`;
- `IN_PROGRESS` → `COMPLETED`;
- `COMPLETED` и `CANCELLED` являются конечными состояниями.

Административные маршруты защищены JWT и дополнительной проверкой роли из базы
данных. Обновление статуса выполняется атомарно, поэтому два одновременных
запроса не смогут незаметно перезаписать друг друга.

## Режим разработки с автоматическим обновлением

Development Compose запускает Next.js с Fast Refresh и NestJS в watch-режиме. Изменения в `apps/frontend/src` и `apps/backend/src` сразу передаются в контейнеры через bind mounts.

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

При старте development-окружения выполняется идемпотентный seed каталога. Его можно
безопасно запустить повторно вручную:

```powershell
docker compose -f compose.dev.yaml exec backend npm run prisma:seed
```

Демонстрационные данные включают шесть услуг, три СТО, рабочие посты,
совместимость постов с услугами и расписание филиалов.

## Развёртывание через Coolify

Для VPS используется отдельный файл `compose.coolify.yaml`. Он не публикует
порты приложений и PostgreSQL напрямую: внешний трафик идёт через HTTPS-прокси
Coolify, а база доступна только контейнерам проекта. Данные PostgreSQL хранятся
в постоянном Docker volume.

В Coolify создайте ресурс **Docker Compose** из Git-репозитория и укажите путь
`/compose.coolify.yaml`. До первого запуска задайте переменные окружения:

```dotenv
POSTGRES_DB=sto_booking
POSTGRES_USER=sto_user
POSTGRES_PASSWORD=<случайный пароль базы>
JWT_SECRET=<случайная строка длиной не менее 32 символов>
NEXT_PUBLIC_API_URL=https://api.example.com/api
CORS_ORIGIN=https://example.com
```

Переменные `ADMIN_LOGIN`, `ADMIN_PASSWORD`, `ADMIN_NAME` и `ADMIN_PHONE`
необязательны и нужны только для создания первой административной учётной
записи. Реальные значения хранятся только в Coolify и никогда не добавляются в
Git.

После создания ресурса назначьте домены его сервисам:

- `https://example.com` → `frontend`, внутренний порт `3000`;
- `https://api.example.com` → `backend`, внутренний порт `5000`.

DNS-записи обоих доменов должны указывать на IP VPS. После изменения доменов или
переменных окружения выполните redeploy. Миграции Prisma и идемпотентный seed
запускаются автоматически при старте backend.

## Модель расписания и бронирования

- `StationWorkingPeriod` хранит обычные рабочие интервалы филиала по дням недели.
- `StationScheduleException` переопределяет расписание на конкретную дату или отмечает выходной.
- `WorkPostType` и `WorkPost` описывают типы и реальные рабочие посты каждого филиала.
- `WorkPostService` задаёт, какие услуги может выполнять конкретный пост.
- `WorkPostDowntime` хранит временные отключения постов.
- `Booking` связывает запись с филиалом, услугой и автоматически выбранным постом.

На уровне PostgreSQL действует exclusion constraint: активные записи со статусами
`PENDING`, `CONFIRMED` и `IN_PROGRESS` не могут пересекаться по времени на одном
рабочем посту. Записи `COMPLETED` и `CANCELLED` не блокируют новые интервалы.
