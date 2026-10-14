import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import { hash } from 'bcryptjs';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

const ADMIN = {
  login: 'e2e.admin',
  password: 'e2e-admin-password',
  name: 'E2E Администратор',
  phone: '+7 700 000 00 01',
};

const CLIENT = {
  login: 'e2e.client',
  password: 'e2e-client-password',
  name: 'E2E Клиент',
  phone: '+7 700 000 00 02',
};

const DAY_MS = 24 * 60 * 60 * 1000;
const BOOKING_TIMEZONE = 'Asia/Qyzylorda';

function assertIsTestDatabase() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is required for E2E tests');

  const databaseName = new URL(databaseUrl).pathname.toLowerCase();
  if (!databaseName.includes('test') && !databaseName.includes('e2e')) {
    throw new Error(
      `E2E tests refuse to use a non-test database: ${databaseName}`,
    );
  }
}

function formatDateInTimezone(date: Date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: BOOKING_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
      .formatToParts(date)
      .filter(({ type }) => type !== 'literal')
      .map(({ type, value }) => [type, value]),
  );

  return `${parts.year}-${parts.month}-${parts.day}`;
}

function futureWorkingDate() {
  for (let offset = 7; offset < 21; offset += 1) {
    const date = formatDateInTimezone(new Date(Date.now() + offset * DAY_MS));
    const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
    if (weekday >= 1 && weekday <= 6) return date;
  }

  throw new Error('Could not find a future working date');
}

describe('STO Booking API (E2E with PostgreSQL)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminPasswordHash: string;

  beforeAll(async () => {
    assertIsTestDatabase();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
    adminPasswordHash = await hash(ADMIN.password, 4);
  });

  beforeEach(async () => {
    await prisma.booking.deleteMany();
    await prisma.vehicle.deleteMany();
    await prisma.workPostDowntime.deleteMany();
    await prisma.stationScheduleException.deleteMany();
    await prisma.user.deleteMany({ where: { role: UserRole.CLIENT } });
    await prisma.user.upsert({
      where: { login: ADMIN.login },
      update: {
        name: ADMIN.name,
        phone: ADMIN.phone,
        passwordHash: adminPasswordHash,
        role: UserRole.ADMIN,
      },
      create: {
        login: ADMIN.login,
        name: ADMIN.name,
        phone: ADMIN.phone,
        passwordHash: adminPasswordHash,
        role: UserRole.ADMIN,
      },
    });
  });

  async function seededOffer(stationSlug: string, serviceSlug: string) {
    const offer = await prisma.stationService.findFirst({
      where: {
        station: { slug: stationSlug },
        service: { slug: serviceSlug },
      },
      select: { stationId: true, serviceId: true },
    });

    if (!offer) {
      throw new Error(
        `Seeded offer ${stationSlug}/${serviceSlug} was not found`,
      );
    }
    return offer;
  }

  async function availability(
    stationId: number,
    serviceId: number,
    date = futureWorkingDate(),
  ) {
    const response = await request(app.getHttpServer())
      .get('/api/availability')
      .query({ stationId, serviceId, date })
      .expect(200);

    return response.body as {
      date: string;
      durationMinutes: number;
      slots: { startsAt: string; endsAt: string }[];
    };
  }

  async function availableSlot(stationId: number, serviceId: number) {
    const result = await availability(stationId, serviceId);
    const slot = result.slots[0] as
      | { startsAt: string; endsAt: string }
      | undefined;

    if (!slot) throw new Error('Seeded offer has no future slots');
    return slot;
  }

  async function registerClient(
    agent: ReturnType<typeof request.agent>,
    login = CLIENT.login,
  ) {
    const response = await agent
      .post('/api/auth/register')
      .send({ ...CLIENT, login })
      .expect(201);

    return response.body.user as {
      id: number;
      login: string;
      role: UserRole;
    };
  }

  async function authenticatedAdmin() {
    const agent = request.agent(app.getHttpServer());
    await agent
      .post('/api/auth/login')
      .send({ login: ADMIN.login, password: ADMIN.password })
      .expect(200);
    return agent;
  }

  async function createGuestBooking() {
    const offer = await seededOffer('m1-east', 'scheduled-maintenance');
    const slot = await availableSlot(offer.stationId, offer.serviceId);
    const response = await request(app.getHttpServer())
      .post('/api/bookings')
      .send({
        ...offer,
        startsAt: slot.startsAt,
        customerName: 'Иван Петров',
        phone: '+7 700 000 00 00',
        vehicle: 'Toyota Camry',
      })
      .expect(201);

    return {
      offer,
      slot,
      booking: response.body as { id: number; workPostId?: number },
    };
  }

  describe('health and catalog', () => {
    it('reports a healthy application connected to PostgreSQL', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/health')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'ok',
        service: 'sto-booking-backend',
        database: 'connected',
      });
      expect(response.body.timestamp).toEqual(expect.any(String));
    });

    it('reads service and station catalogs and their details', async () => {
      const services = await request(app.getHttpServer())
        .get('/api/services')
        .expect(200);
      const stations = await request(app.getHttpServer())
        .get('/api/stations')
        .expect(200);

      expect(services.body.length).toBeGreaterThan(0);
      expect(stations.body.length).toBeGreaterThan(0);

      const service = await request(app.getHttpServer())
        .get(`/api/services/${services.body[0].id}`)
        .expect(200);
      const station = await request(app.getHttpServer())
        .get(`/api/stations/${stations.body[0].id}`)
        .expect(200);
      const stationServices = await request(app.getHttpServer())
        .get(`/api/stations/${stations.body[0].id}/services`)
        .expect(200);

      expect(service.body.stations.length).toBeGreaterThan(0);
      expect(station.body.services).toEqual(stationServices.body);
    });

    it('rejects malformed catalog identifiers', async () => {
      await request(app.getHttpServer())
        .get('/api/services/not-a-number')
        .expect(400);
      await request(app.getHttpServer())
        .get('/api/stations/not-a-number')
        .expect(400);
    });

    it('returns 404 for missing catalog entities', async () => {
      await request(app.getHttpServer()).get('/api/services/999999').expect(404);
      await request(app.getHttpServer()).get('/api/stations/999999').expect(404);
      await request(app.getHttpServer())
        .get('/api/stations/999999/services')
        .expect(404);
    });
  });

  describe('availability', () => {
    it('returns future slots for a valid station offer', async () => {
      const offer = await seededOffer('m1-center', 'computer-diagnostics');
      const response = await request(app.getHttpServer())
        .get('/api/availability')
        .query({ ...offer, date: futureWorkingDate() })
        .expect(200);

      expect(response.body).toMatchObject({
        ...offer,
        timezone: BOOKING_TIMEZONE,
        slotStepMinutes: 30,
      });
      expect(response.body.slots.length).toBeGreaterThan(0);
    });

    it('rejects an invalid availability query', async () => {
      await request(app.getHttpServer())
        .get('/api/availability')
        .query({ stationId: 0, serviceId: 1, date: '31-02-2030' })
        .expect(400);
    });

    it('returns 404 when a station does not offer the service', async () => {
      const station = await prisma.station.findUniqueOrThrow({
        where: { slug: 'm1-east' },
      });
      const service = await prisma.service.findUniqueOrThrow({
        where: { slug: 'brake-service' },
      });

      await request(app.getHttpServer())
        .get('/api/availability')
        .query({
          stationId: station.id,
          serviceId: service.id,
          date: futureWorkingDate(),
        })
        .expect(404);
    });

    it('returns no slots when a schedule exception closes the station', async () => {
      const offer = await seededOffer('m1-center', 'computer-diagnostics');
      const date = futureWorkingDate();
      await prisma.stationScheduleException.create({
        data: {
          stationId: offer.stationId,
          date: new Date(`${date}T00:00:00.000Z`),
          isClosed: true,
          reason: 'E2E closed day',
        },
      });

      const result = await availability(
        offer.stationId,
        offer.serviceId,
        date,
      );
      expect(result.slots).toEqual([]);
    });

    it('uses shortened hours from a schedule exception', async () => {
      const offer = await seededOffer('m1-center', 'computer-diagnostics');
      const date = futureWorkingDate();
      await prisma.stationScheduleException.create({
        data: {
          stationId: offer.stationId,
          date: new Date(`${date}T00:00:00.000Z`),
          isClosed: false,
          startsMinute: 10 * 60,
          endsMinute: 12 * 60,
          reason: 'E2E shortened day',
        },
      });

      const result = await availability(
        offer.stationId,
        offer.serviceId,
        date,
      );
      expect(result.slots.map(({ startsAt }) => startsAt)).toEqual([
        `${date}T10:00:00+05:00`,
        `${date}T10:30:00+05:00`,
        `${date}T11:00:00+05:00`,
      ]);
      expect(result.slots.at(-1)?.endsAt).toBe(`${date}T11:45:00+05:00`);
    });

    it('removes slots that overlap a work-post downtime', async () => {
      const offer = await seededOffer('m1-east', 'scheduled-maintenance');
      const slot = await availableSlot(offer.stationId, offer.serviceId);
      const assignment = await prisma.workPostService.findFirstOrThrow({
        where: offer,
        select: { workPostId: true },
      });
      await prisma.workPostDowntime.create({
        data: {
          workPostId: assignment.workPostId,
          startsAt: new Date(slot.startsAt),
          endsAt: new Date(slot.endsAt),
          reason: 'E2E maintenance',
        },
      });

      const result = await availability(offer.stationId, offer.serviceId);
      expect(result.slots.map(({ startsAt }) => startsAt)).not.toContain(
        slot.startsAt,
      );
    });

    it('keeps a slot until every compatible post is occupied', async () => {
      const offer = await seededOffer('m1-center', 'scheduled-maintenance');
      const slot = await availableSlot(offer.stationId, offer.serviceId);
      const payload = {
        ...offer,
        startsAt: slot.startsAt,
        customerName: 'Первый клиент',
        phone: '+7 700 000 00 11',
        vehicle: 'Первый автомобиль',
      };

      await request(app.getHttpServer())
        .post('/api/bookings')
        .send(payload)
        .expect(201);
      let result = await availability(offer.stationId, offer.serviceId);
      expect(result.slots.map(({ startsAt }) => startsAt)).toContain(
        slot.startsAt,
      );

      await request(app.getHttpServer())
        .post('/api/bookings')
        .send({
          ...payload,
          customerName: 'Второй клиент',
          phone: '+7 700 000 00 12',
          vehicle: 'Второй автомобиль',
        })
        .expect(201);
      result = await availability(offer.stationId, offer.serviceId);
      expect(result.slots.map(({ startsAt }) => startsAt)).not.toContain(
        slot.startsAt,
      );
    });

    it('blocks partial overlaps but allows an adjacent booking', async () => {
      const offer = await seededOffer('m1-east', 'scheduled-maintenance');
      const slot = await availableSlot(offer.stationId, offer.serviceId);
      await request(app.getHttpServer())
        .post('/api/bookings')
        .send({
          ...offer,
          startsAt: slot.startsAt,
          customerName: 'Иван Петров',
          phone: '+7 700 000 00 00',
          vehicle: 'Toyota Camry',
        })
        .expect(201);

      const result = await availability(offer.stationId, offer.serviceId);
      const starts = result.slots.map(({ startsAt }) => new Date(startsAt).getTime());
      const start = new Date(slot.startsAt).getTime();

      expect(starts).not.toContain(start + 30 * 60_000);
      expect(starts).not.toContain(start + 60 * 60_000);
      expect(starts).toContain(new Date(slot.endsAt).getTime());
    });
  });

  describe('authentication and profile', () => {
    it('registers a client, authenticates the cookie and logs out', async () => {
      const agent = request.agent(app.getHttpServer());
      const user = await registerClient(agent);
      expect(user).toMatchObject({ login: CLIENT.login, role: UserRole.CLIENT });

      await agent.get('/api/auth/me').expect(200).expect(({ body }) => {
        expect(body.user.id).toBe(user.id);
        expect(body.user).not.toHaveProperty('passwordHash');
      });
      await agent.post('/api/auth/logout').expect(204);
      await agent.get('/api/auth/me').expect(401);
    });

    it('logs in an existing client and updates the profile', async () => {
      await registerClient(request.agent(app.getHttpServer()));
      const agent = request.agent(app.getHttpServer());
      await agent
        .post('/api/auth/login')
        .send({ login: CLIENT.login.toUpperCase(), password: CLIENT.password })
        .expect(200);
      await agent
        .patch('/api/auth/profile')
        .send({ name: 'Обновлённый клиент', phone: '+7 777 111 22 33' })
        .expect(200)
        .expect(({ body }) => {
          expect(body.user).toMatchObject({
            name: 'Обновлённый клиент',
            phone: '+7 777 111 22 33',
          });
        });
    });

    it('rejects invalid registration and profile payloads', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ login: 'x!', password: 'short', name: '', phone: '' })
        .expect(400);
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ ...CLIENT, role: UserRole.ADMIN })
        .expect(400);

      const agent = request.agent(app.getHttpServer());
      await registerClient(agent);
      await agent.patch('/api/auth/profile').send({ name: 'X' }).expect(400);
    });

    it('returns 409 for a duplicate login', async () => {
      await registerClient(request.agent(app.getHttpServer()));
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(CLIENT)
        .expect(409);
    });

    it('does not authenticate unknown users or invalid passwords', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ login: 'missing.user', password: CLIENT.password })
        .expect(401);
      await registerClient(request.agent(app.getHttpServer()));
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ login: CLIENT.login, password: 'incorrect-password' })
        .expect(401);
    });

    it('protects current-user and profile endpoints', async () => {
      await request(app.getHttpServer()).get('/api/auth/me').expect(401);
      await request(app.getHttpServer())
        .patch('/api/auth/profile')
        .send({ name: 'Новый клиент' })
        .expect(401);
    });
  });

  describe('vehicles', () => {
    it('creates, lists and deletes the current client vehicle', async () => {
      const agent = request.agent(app.getHttpServer());
      await registerClient(agent);
      const created = await agent
        .post('/api/vehicles')
        .send({ name: 'Toyota Camry, 2024' })
        .expect(201);

      await agent.get('/api/vehicles').expect(200).expect(({ body }) => {
        expect(body).toEqual([
          expect.objectContaining({
            id: created.body.id,
            name: 'Toyota Camry, 2024',
          }),
        ]);
      });
      await agent.delete(`/api/vehicles/${created.body.id}`).expect(204);
      await agent.get('/api/vehicles').expect(200).expect([]);
    });

    it('rejects invalid and duplicate vehicles', async () => {
      const agent = request.agent(app.getHttpServer());
      await registerClient(agent);
      await agent.post('/api/vehicles').send({ name: 'X' }).expect(400);
      await agent.post('/api/vehicles').send({ name: 'Lexus RX' }).expect(201);
      await agent.post('/api/vehicles').send({ name: 'Lexus RX' }).expect(409);
    });

    it('returns 404 for a missing vehicle', async () => {
      const agent = request.agent(app.getHttpServer());
      await registerClient(agent);
      await agent.delete('/api/vehicles/999999').expect(404);
    });

    it('requires authorization for every vehicle operation', async () => {
      await request(app.getHttpServer()).get('/api/vehicles').expect(401);
      await request(app.getHttpServer())
        .post('/api/vehicles')
        .send({ name: 'Lexus RX' })
        .expect(401);
      await request(app.getHttpServer()).delete('/api/vehicles/1').expect(401);
    });

    it('does not allow one client to delete another client vehicle', async () => {
      const owner = request.agent(app.getHttpServer());
      await registerClient(owner, 'vehicle.owner');
      const vehicle = await owner
        .post('/api/vehicles')
        .send({ name: 'BMW X5' })
        .expect(201);

      const intruder = request.agent(app.getHttpServer());
      await registerClient(intruder, 'vehicle.intruder');
      await intruder.delete(`/api/vehicles/${vehicle.body.id}`).expect(404);
      await owner.get('/api/vehicles').expect(200).expect(({ body }) => {
        expect(body).toHaveLength(1);
      });
    });
  });

  describe('bookings', () => {
    it('creates a guest booking and persists it on a work post', async () => {
      const { offer, booking } = await createGuestBooking();
      expect(booking).not.toHaveProperty('workPostId');

      const stored = await prisma.booking.findUniqueOrThrow({
        where: { id: booking.id },
      });
      expect(stored).toMatchObject({ ...offer, status: 'PENDING' });
      expect(stored.workPostId).toEqual(expect.any(Number));
    });

    it('creates and lists an authenticated booking with an owned vehicle', async () => {
      const agent = request.agent(app.getHttpServer());
      await registerClient(agent);
      const vehicle = await agent
        .post('/api/vehicles')
        .send({ name: 'Audi Q7' })
        .expect(201);
      const offer = await seededOffer('m1-east', 'scheduled-maintenance');
      const slot = await availableSlot(offer.stationId, offer.serviceId);

      const created = await agent
        .post('/api/bookings')
        .send({ ...offer, startsAt: slot.startsAt, vehicleId: vehicle.body.id })
        .expect(201);

      expect(created.body).not.toHaveProperty('workPostId');
      expect(created.body).toMatchObject({
        ...offer,
        vehicleId: vehicle.body.id,
        customerName: CLIENT.name,
        phone: CLIENT.phone,
        vehicle: 'Audi Q7',
      });
      await agent.get('/api/bookings/me').expect(200).expect(({ body }) => {
        expect(body).toHaveLength(1);
        expect(body[0]).toMatchObject({ id: created.body.id });
      });
    });

    it('rejects an invalid booking payload', async () => {
      await request(app.getHttpServer())
        .post('/api/bookings')
        .send({ stationId: 0, serviceId: 0, startsAt: 'tomorrow' })
        .expect(400);
    });

    it('returns 404 for an unavailable station-service pair', async () => {
      await request(app.getHttpServer())
        .post('/api/bookings')
        .send({
          stationId: 999999,
          serviceId: 999999,
          startsAt: '2035-01-01T10:00:00+05:00',
          customerName: 'Иван Петров',
          phone: '+7 700 000 00 00',
          vehicle: 'Toyota Camry',
        })
        .expect(404);
    });

    it('allows only one of two concurrent requests for a single post', async () => {
      const offer = await seededOffer('m1-east', 'scheduled-maintenance');
      const slot = await availableSlot(offer.stationId, offer.serviceId);
      const payload = {
        ...offer,
        startsAt: slot.startsAt,
        customerName: 'Иван Петров',
        phone: '+7 700 000 00 00',
        vehicle: 'Toyota Camry',
      };

      const responses = await Promise.all([
        request(app.getHttpServer()).post('/api/bookings').send(payload),
        request(app.getHttpServer())
          .post('/api/bookings')
          .send({
            ...payload,
            customerName: 'Другой клиент',
            phone: '+7 700 000 00 03',
            vehicle: 'Kia Sportage',
          }),
      ]);

      expect(
        responses.map(({ status }) => status).sort((left, right) => left - right),
      ).toEqual([201, 409]);
      await expect(prisma.booking.count()).resolves.toBe(1);
    });

    it('makes a cancelled booking slot available again', async () => {
      const { offer, slot, booking } = await createGuestBooking();
      let result = await availability(offer.stationId, offer.serviceId);
      expect(result.slots.map(({ startsAt }) => startsAt)).not.toContain(
        slot.startsAt,
      );

      const admin = await authenticatedAdmin();
      await admin
        .patch(`/api/admin/bookings/${booking.id}/status`)
        .send({ status: 'CANCELLED' })
        .expect(200);

      result = await availability(offer.stationId, offer.serviceId);
      expect(result.slots.map(({ startsAt }) => startsAt)).toContain(
        slot.startsAt,
      );
    });

    it('makes a completed booking slot available again', async () => {
      const { offer, slot, booking } = await createGuestBooking();
      const admin = await authenticatedAdmin();

      for (const status of ['CONFIRMED', 'IN_PROGRESS', 'COMPLETED']) {
        await admin
          .patch(`/api/admin/bookings/${booking.id}/status`)
          .send({ status })
          .expect(200);
      }

      const result = await availability(offer.stationId, offer.serviceId);
      expect(result.slots.map(({ startsAt }) => startsAt)).toContain(
        slot.startsAt,
      );
    });

    it('keeps the original price and duration after the offer changes', async () => {
      const { offer, booking } = await createGuestBooking();
      const original = await prisma.stationService.findUniqueOrThrow({
        where: {
          stationId_serviceId: offer,
        },
        select: { durationMinutes: true, priceFrom: true },
      });

      try {
        await prisma.stationService.update({
          where: { stationId_serviceId: offer },
          data: {
            durationMinutes: original.durationMinutes + 15,
            priceFrom: original.priceFrom + 5_000,
          },
        });

        const stored = await prisma.booking.findUniqueOrThrow({
          where: { id: booking.id },
        });
        expect(stored).toMatchObject({
          durationMinutes: original.durationMinutes,
          priceAmount: original.priceFrom,
        });
      } finally {
        await prisma.stationService.update({
          where: { stationId_serviceId: offer },
          data: original,
        });
      }
    });

    it('rejects a saved vehicle owned by another client', async () => {
      const owner = request.agent(app.getHttpServer());
      await registerClient(owner, 'booking.owner');
      const vehicle = await owner
        .post('/api/vehicles')
        .send({ name: 'Volvo XC90' })
        .expect(201);

      const intruder = request.agent(app.getHttpServer());
      await registerClient(intruder, 'booking.intruder');
      const offer = await seededOffer('m1-east', 'scheduled-maintenance');
      const slot = await availableSlot(offer.stationId, offer.serviceId);
      await intruder
        .post('/api/bookings')
        .send({ ...offer, startsAt: slot.startsAt, vehicleId: vehicle.body.id })
        .expect(400);
    });

    it('requires authorization to list personal bookings', async () => {
      await request(app.getHttpServer()).get('/api/bookings/me').expect(401);
    });
  });

  describe('administration', () => {
    it('lists, filters, reads and advances a booking status', async () => {
      const { booking } = await createGuestBooking();
      const admin = await authenticatedAdmin();

      await admin
        .get('/api/admin/bookings')
        .query({ status: 'PENDING' })
        .expect(200)
        .expect(({ body }) => {
          expect(body).toHaveLength(1);
          expect(body[0]).toMatchObject({ id: booking.id, status: 'PENDING' });
          expect(body[0]).toHaveProperty('station');
          expect(body[0]).toHaveProperty('service');
          expect(body[0]).toHaveProperty('workPost');
        });
      await admin.get(`/api/admin/bookings/${booking.id}`).expect(200);
      await admin
        .patch(`/api/admin/bookings/${booking.id}/status`)
        .send({ status: 'CONFIRMED' })
        .expect(200)
        .expect(({ body }) => {
          expect(body.status).toBe('CONFIRMED');
        });
    });

    it('rejects invalid filters, payloads and status transitions', async () => {
      const { booking } = await createGuestBooking();
      const admin = await authenticatedAdmin();
      await admin
        .get('/api/admin/bookings')
        .query({ status: 'UNKNOWN' })
        .expect(400);
      await admin
        .get('/api/admin/bookings')
        .query({ from: '2031-02-02', to: '2031-01-01' })
        .expect(400);
      await admin
        .patch(`/api/admin/bookings/${booking.id}/status`)
        .send({ status: 'COMPLETED' })
        .expect(400);
    });

    it('returns 404 for missing bookings', async () => {
      const admin = await authenticatedAdmin();
      await admin.get('/api/admin/bookings/999999').expect(404);
      await admin
        .patch('/api/admin/bookings/999999/status')
        .send({ status: 'CONFIRMED' })
        .expect(404);
    });

    it('requires authorization for administrative operations', async () => {
      await request(app.getHttpServer()).get('/api/admin/bookings').expect(401);
      await request(app.getHttpServer())
        .get('/api/admin/bookings/1')
        .expect(401);
      await request(app.getHttpServer())
        .patch('/api/admin/bookings/1/status')
        .send({ status: 'CONFIRMED' })
        .expect(401);
    });

    it('forbids administrative operations for a client', async () => {
      const client = request.agent(app.getHttpServer());
      await registerClient(client);
      await client.get('/api/admin/bookings').expect(403);
      await client.get('/api/admin/bookings/1').expect(403);
      await client
        .patch('/api/admin/bookings/1/status')
        .send({ status: 'CONFIRMED' })
        .expect(403);
    });
  });

  afterAll(async () => {
    await app.close();
  });
});
