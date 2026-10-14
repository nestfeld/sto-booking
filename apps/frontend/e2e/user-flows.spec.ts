import { expect, test, type APIRequestContext, type Page } from '@playwright/test'

const apiUrl = process.env.PLAYWRIGHT_API_URL ?? 'http://localhost:5000/api'
const adminLogin = process.env.PLAYWRIGHT_ADMIN_LOGIN ?? 'e2e.admin'
const adminPassword = process.env.PLAYWRIGHT_ADMIN_PASSWORD ?? 'e2e-admin-password'
const bookingTimezone = 'Asia/Qyzylorda'
const dayMs = 24 * 60 * 60 * 1000

const monthNames = [
  'Январь',
  'Февраль',
  'Март',
  'Апрель',
  'Май',
  'Июнь',
  'Июль',
  'Август',
  'Сентябрь',
  'Октябрь',
  'Ноябрь',
  'Декабрь',
]

const monthNamesGenitive = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
]

function formatDateInTimezone(date: Date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: bookingTimezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
      .formatToParts(date)
      .filter(({ type }) => type !== 'literal')
      .map(({ type, value }) => [type, value]),
  )

  return `${parts.year}-${parts.month}-${parts.day}`
}

function futureWorkingDate() {
  for (let offset = 7; offset < 21; offset += 1) {
    const date = formatDateInTimezone(new Date(Date.now() + offset * dayMs))
    const weekday = new Date(`${date}T12:00:00Z`).getUTCDay()
    if (weekday >= 1 && weekday <= 6) return date
  }

  throw new Error('Could not find a future working date')
}

async function selectCalendarDate(page: Page, value: string) {
  const [year, month, day] = value.split('-').map(Number)
  const calendar = page.getByLabel('Календарь даты визита')
  const expectedMonth = `${monthNames[month - 1]} ${year}`

  while (!(await calendar.locator('strong').getByText(expectedMonth).isVisible())) {
    await calendar.getByRole('button', { name: 'Следующий месяц' }).click()
  }

  await calendar
    .getByRole('button', {
      name: `${day} ${monthNamesGenitive[month - 1]} ${year}`,
    })
    .click()
}

async function createBookingViaApi(
  request: APIRequestContext,
  vehicle: string,
) {
  const servicesResponse = await request.get(`${apiUrl}/services`)
  expect(servicesResponse.ok()).toBeTruthy()
  const services = (await servicesResponse.json()) as Array<{
    id: number
    slug: string
  }>
  const service = services.find(({ slug }) => slug === 'scheduled-maintenance')
  if (!service) throw new Error('Seeded service was not found')

  const detailsResponse = await request.get(`${apiUrl}/services/${service.id}`)
  expect(detailsResponse.ok()).toBeTruthy()
  const details = (await detailsResponse.json()) as {
    stations: Array<{ id: number; slug: string }>
  }
  const station = details.stations.find(({ slug }) => slug === 'm1-east')
  if (!station) throw new Error('Seeded station was not found')

  const availabilityResponse = await request.get(`${apiUrl}/availability`, {
    params: {
      stationId: station.id,
      serviceId: service.id,
      date: futureWorkingDate(),
    },
  })
  expect(availabilityResponse.ok()).toBeTruthy()
  const availability = (await availabilityResponse.json()) as {
    slots: Array<{ startsAt: string }>
  }
  const slot = availability.slots[0]
  if (!slot) throw new Error('No future slot is available')

  const bookingResponse = await request.post(`${apiUrl}/bookings`, {
    data: {
      stationId: station.id,
      serviceId: service.id,
      startsAt: slot.startsAt,
      customerName: 'Browser E2E Клиент',
      phone: '+7 700 000 00 91',
      vehicle,
    },
  })
  expect(bookingResponse.status()).toBe(201)
}

test('guest completes the booking flow in the browser', async ({ page }) => {
  await page.goto('/booking')
  await expect(
    page.getByRole('heading', { name: /Запись без звонка/ }),
  ).toBeVisible()

  await page
    .getByRole('button', { name: /Техническое обслуживание/ })
    .click()
  await page.getByRole('button', { name: /Выбрать СТО/ }).click()
  await page.getByRole('button', { name: /M1 Восток/ }).click()
  await selectCalendarDate(page, futureWorkingDate())

  const firstSlot = page.locator('.booking-time-grid button').first()
  await expect(firstSlot).toBeVisible()
  await firstSlot.click()
  await page.getByRole('button', { name: /Контактные данные/ }).click()

  await page.getByLabel('Ваше имя').fill('Playwright Гость')
  await page.getByLabel('Телефон').fill('+7 700 000 00 90')
  await page.getByLabel('Автомобиль').fill('Playwright Guest Car')
  await page.getByRole('button', { name: /Создать запись/ }).click()

  await expect(page.getByRole('heading', { name: 'Ждём вас в M1' })).toBeVisible()
  await expect(page.getByText('Playwright Guest Car')).toBeVisible()
})

test('client registers, manages the garage and logs in again', async ({ page }) => {
  const login = 'browser.client'
  const password = 'browser-client-password'
  const vehicle = 'Playwright Garage Car'

  await page.goto('/login')
  await page.getByRole('tab', { name: 'Регистрация' }).click()
  await page.getByLabel('Ваше имя').fill('Browser Клиент')
  await page.getByLabel('Телефон').fill('+7 700 000 00 92')
  await page.getByLabel('Логин').fill(login)
  await page.getByLabel('Пароль').fill(password)
  await page.getByRole('button', { name: /Создать аккаунт/ }).click()

  await expect(page).toHaveURL(/\/account$/)
  await expect(page.getByRole('heading', { name: 'Browser Клиент' })).toBeVisible()
  await page.getByRole('button', { name: /Гараж/ }).click()
  await page.getByLabel('Марка, модель и год').fill(vehicle)
  await page.getByRole('button', { name: /Добавить автомобиль/ }).click()
  await expect(page.getByText(vehicle)).toBeVisible()

  await page.getByRole('button', { name: 'Выйти' }).click()
  await expect(page).toHaveURL(/\/login$/)
  await page.getByLabel('Логин').fill(login)
  await page.getByLabel('Пароль').fill(password)
  await page.getByRole('button', { name: /^Войти/ }).click()

  await expect(page).toHaveURL(/\/account$/)
  await page.getByRole('button', { name: /Гараж/ }).click()
  await expect(page.getByText(vehicle)).toBeVisible()
})

test('administrator confirms a booking from the dashboard', async ({
  page,
  request,
}) => {
  const vehicle = 'Playwright Admin Car'
  await createBookingViaApi(request, vehicle)

  await page.goto('/login')
  await page.getByLabel('Логин').fill(adminLogin)
  await page.getByLabel('Пароль').fill(adminPassword)
  await page.getByRole('button', { name: /^Войти/ }).click()

  await expect(page).toHaveURL(/\/admin$/)
  await expect(page.getByRole('heading', { name: 'Записи клиентов' })).toBeVisible()
  const booking = page.locator('article.admin-booking-card').filter({
    hasText: vehicle,
  })
  await expect(booking).toBeVisible()
  await booking.getByRole('button', { name: 'Подтвердить' }).click()
  await expect(booking.locator('[data-status="CONFIRMED"]')).toHaveText(
    'Подтверждена',
  )
})
