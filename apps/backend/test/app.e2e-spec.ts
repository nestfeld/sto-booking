import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { PrismaService } from './../src/prisma/prisma.service.js';
import { vi } from 'vitest';

process.env.JWT_SECRET =
  process.env.JWT_SECRET ?? 'test-jwt-secret-that-is-at-least-32-characters';

type MockUser = {
  id: number;
  login: string;
  name: string;
  phone: string;
  role: 'CLIENT' | 'ADMIN';
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
};

type MockVehicle = {
  id: number;
  userId: number;
  name: string;
  createdAt: Date;
  updatedAt: Date;
};

type UserQuery = {
  where: { id?: number; login?: string };
  select?: Record<string, boolean>;
};

function selectUser(user: MockUser, select?: Record<string, boolean>) {
  if (!select) return user;

  return Object.fromEntries(
    Object.entries(user).filter(([key]) => select[key]),
  );
}

function selectVehicle(
  vehicle: MockVehicle,
  select?: Record<string, boolean>,
) {
  if (!select) return vehicle;

  return Object.fromEntries(
    Object.entries(vehicle).filter(([key]) => select[key]),
  );
}

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;
  let storedUser: MockUser | null;
  let storedVehicles: MockVehicle[];

  beforeEach(async () => {
    storedUser = null;
    storedVehicles = [];

    const queryRaw = vi.fn((query: { strings?: readonly string[] }) => {
      const sql = query.strings?.join(' ') ?? '';

      if (sql.includes('INSERT INTO "Booking"')) {
        return Promise.resolve([
          {
            id: 1,
            stationId: 1,
            serviceId: 1,
            customerName: 'Иван Петров',
            phone: '+7 700 000 00 00',
            vehicle: 'Toyota Camry',
            startsAt: new Date('2030-10-15T09:00:00Z'),
            endsAt: new Date('2030-10-15T10:00:00Z'),
            durationMinutes: 60,
            priceAmount: 10_000,
            status: 'PENDING',
            createdAt: new Date('2030-10-01T00:00:00Z'),
          },
        ]);
      }

      return Promise.resolve([{ '?column?': 1 }]);
    });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
        $queryRaw: queryRaw,
        service: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: 1,
              slug: 'diagnostics',
              name: 'Диагностика',
              description: 'Описание',
              category: 'Диагностика',
              durationMinutes: 45,
              priceFrom: 8000,
              stations: [{ stationId: 1 }],
            },
          ]),
        },
        station: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: 1,
              slug: 'center',
              name: 'M1 Центр',
              address: 'Адрес',
              phone: null,
              timezone: 'Asia/Qyzylorda',
              services: [{ serviceId: 1 }],
            },
          ]),
        },
        stationService: {
          findFirst: vi.fn().mockResolvedValue({
            durationMinutes: 60,
            priceFrom: 10_000,
            station: { timezone: 'UTC' },
            workPosts: [{ workPostId: 1 }],
          }),
        },
        workPost: {
          findMany: vi.fn().mockResolvedValue([{ id: 1 }]),
        },
        stationScheduleException: {
          findUnique: vi.fn().mockResolvedValue(null),
        },
        stationWorkingPeriod: {
          findMany: vi
            .fn()
            .mockResolvedValue([{ startsMinute: 540, endsMinute: 600 }]),
        },
        booking: { findMany: vi.fn().mockResolvedValue([]) },
        workPostDowntime: { findMany: vi.fn().mockResolvedValue([]) },
        user: {
          findUnique: vi.fn(({ where, select }: UserQuery) => {
            const matches =
              storedUser &&
              (where.id === storedUser.id || where.login === storedUser.login);

            return Promise.resolve(
              matches && storedUser ? selectUser(storedUser, select) : null,
            );
          }),
          create: vi.fn(
            ({
              data,
              select,
            }: {
              data: {
                login: string;
                name: string;
                phone: string;
                passwordHash: string;
              };
              select?: Record<string, boolean>;
            }) => {
              storedUser = {
                id: 1,
                login: data.login,
                name: data.name,
                phone: data.phone,
                role: 'CLIENT',
                passwordHash: data.passwordHash,
                createdAt: new Date('2030-01-01T00:00:00Z'),
                updatedAt: new Date('2030-01-01T00:00:00Z'),
              };

              return Promise.resolve(selectUser(storedUser, select));
            },
          ),
          update: vi.fn(
            ({
              where,
              data,
              select,
            }: {
              where: { id: number };
              data: { name?: string; phone?: string };
              select?: Record<string, boolean>;
            }) => {
              if (!storedUser || storedUser.id !== where.id) {
                return Promise.resolve(null);
              }

              storedUser = {
                ...storedUser,
                ...data,
                updatedAt: new Date('2030-01-02T00:00:00Z'),
              };
              return Promise.resolve(selectUser(storedUser, select));
            },
          ),
        },
        vehicle: {
          findMany: vi.fn(
            ({ where }: { where: { userId: number } }) =>
              Promise.resolve(
                storedVehicles.filter(
                  (vehicle) => vehicle.userId === where.userId,
                ),
              ),
          ),
          findFirst: vi.fn(
            ({
              where,
              select,
            }: {
              where: { id: number; userId: number };
              select?: Record<string, boolean>;
            }) => {
              const vehicle = storedVehicles.find(
                (item) =>
                  item.id === where.id && item.userId === where.userId,
              );
              return Promise.resolve(
                vehicle ? selectVehicle(vehicle, select) : null,
              );
            },
          ),
          create: vi.fn(
            ({
              data,
              select,
            }: {
              data: { userId: number; name: string };
              select?: Record<string, boolean>;
            }) => {
              const vehicle = {
                id: storedVehicles.length + 1,
                userId: data.userId,
                name: data.name,
                createdAt: new Date('2030-01-01T00:00:00Z'),
                updatedAt: new Date('2030-01-01T00:00:00Z'),
              };
              storedVehicles.unshift(vehicle);
              return Promise.resolve(selectVehicle(vehicle, select));
            },
          ),
          delete: vi.fn(({ where }: { where: { id: number } }) => {
            const vehicle = storedVehicles.find((item) => item.id === where.id);
            storedVehicles = storedVehicles.filter((item) => item.id !== where.id);
            return Promise.resolve(vehicle);
          }),
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/api/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/health')
      .expect(200)
      .expect((response) => {
        expect(response.body).toMatchObject({
          status: 'ok',
          database: 'connected',
        });
      });
  });

  it('/api/services (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/services')
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual([
          expect.objectContaining({ id: 1, stationCount: 1 }),
        ]);
      });
  });

  it('/api/stations (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/stations')
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual([
          expect.objectContaining({ id: 1, serviceCount: 1 }),
        ]);
      });
  });

  it('/api/availability (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/availability')
      .query({ stationId: 1, serviceId: 1, date: '2030-10-15' })
      .expect(200)
      .expect((response) => {
        expect(response.body).toMatchObject({
          stationId: 1,
          serviceId: 1,
          durationMinutes: 60,
          slots: [
            {
              startsAt: '2030-10-15T09:00:00+00:00',
              endsAt: '2030-10-15T10:00:00+00:00',
            },
          ],
        });
      });
  });

  it('/api/availability rejects invalid query (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/availability')
      .query({ stationId: 0, serviceId: 1, date: '13-10-2026' })
      .expect(400);
  });

  it('/api/bookings creates a guest booking (POST)', () => {
    return request(app.getHttpServer())
      .post('/api/bookings')
      .send({
        stationId: 1,
        serviceId: 1,
        startsAt: '2030-10-15T09:00:00Z',
        customerName: 'Иван Петров',
        phone: '+7 700 000 00 00',
        vehicle: 'Toyota Camry',
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          id: 1,
          stationId: 1,
          serviceId: 1,
          status: 'PENDING',
        });
        expect(body).not.toHaveProperty('workPostId');
      });
  });

  it('/api/bookings validates the request body (POST)', () => {
    return request(app.getHttpServer())
      .post('/api/bookings')
      .send({ stationId: 0, startsAt: 'tomorrow' })
      .expect(400);
  });

  it('registers, authenticates, logs out and logs in again', async () => {
    const agent = request.agent(app.getHttpServer());

    const registerResponse = await agent
      .post('/api/auth/register')
      .send({
        login: 'Client.One',
        password: 'strong-password',
        name: 'Иван Петров',
        phone: 'примерный номер',
      })
      .expect(201);

    expect(registerResponse.body.user).toMatchObject({
      id: 1,
      login: 'client.one',
      name: 'Иван Петров',
      phone: 'примерный номер',
    });
    expect(registerResponse.headers['set-cookie']?.[0]).toContain('HttpOnly');

    await agent
      .get('/api/auth/me')
      .expect(200)
      .expect(({ body }) => {
        expect(body.user).toMatchObject({ id: 1, login: 'client.one' });
        expect(body.user).not.toHaveProperty('passwordHash');
      });

    await agent
      .patch('/api/auth/profile')
      .send({ name: 'Иван Обновлённый', phone: '+7 777 555 44 33' })
      .expect(200)
      .expect(({ body }) => {
        expect(body.user).toMatchObject({
          name: 'Иван Обновлённый',
          phone: '+7 777 555 44 33',
        });
      });

    await agent.post('/api/auth/logout').expect(204);
    await agent.get('/api/auth/me').expect(401);

    await agent
      .post('/api/auth/login')
      .send({ login: 'CLIENT.ONE', password: 'strong-password' })
      .expect(200);

    await agent.get('/api/auth/me').expect(200);
  });

  it('rejects a duplicate login', async () => {
    const credentials = {
      login: 'client',
      password: 'strong-password',
      name: 'Иван',
      phone: '+7 700 000 00 00',
    };

    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send(credentials)
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send(credentials)
      .expect(409);
  });

  it('allows only administrators to list all bookings', async () => {
    const agent = request.agent(app.getHttpServer());

    await agent
      .post('/api/auth/register')
      .send({
        login: 'admin.check',
        password: 'strong-password',
        name: 'Администратор',
        phone: '+7 700 000 00 00',
      })
      .expect(201);

    await agent.get('/api/admin/bookings').expect(403);

    if (!storedUser) throw new Error('Test user was not created');
    storedUser.role = 'ADMIN';

    await agent.get('/api/admin/bookings').expect(200).expect([]);
  });

  it('validates registration credentials', () => {
    return request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ login: 'x!', password: 'short' })
      .expect(400);
  });

  it('adds vehicles and creates an authenticated booking without contact fields', async () => {
    const agent = request.agent(app.getHttpServer());

    await agent
      .post('/api/auth/register')
      .send({
        login: 'vehicle.owner',
        password: 'strong-password',
        name: 'Анна',
        phone: '+7 777 000 11 22',
      })
      .expect(201);

    const vehicleResponse = await agent
      .post('/api/vehicles')
      .send({ name: 'Toyota Camry, 2022' })
      .expect(201);

    await agent
      .get('/api/vehicles')
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual([
          expect.objectContaining({
            id: vehicleResponse.body.id,
            name: 'Toyota Camry, 2022',
          }),
        ]);
      });

    await agent
      .post('/api/bookings')
      .send({
        stationId: 1,
        serviceId: 1,
        startsAt: '2030-10-15T09:00:00Z',
        vehicleId: vehicleResponse.body.id,
      })
      .expect(201);

    await agent.get('/api/bookings/me').expect(200).expect([]);

    await agent
      .delete(`/api/vehicles/${vehicleResponse.body.id}`)
      .expect(204);
    await agent.get('/api/vehicles').expect(200).expect([]);
  });

  afterEach(async () => {
    await app.close();
  });
});
