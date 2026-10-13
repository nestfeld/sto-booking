import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();
const PASSWORD_HASH_ROUNDS = 12;

const services = [
  {
    slug: 'computer-diagnostics',
    name: 'Компьютерная диагностика',
    description:
      'Проверка электронных систем, чтение ошибок и первичная оценка состояния автомобиля.',
    category: 'Диагностика',
    durationMinutes: 45,
    priceFrom: 8000,
    sortOrder: 10,
  },
  {
    slug: 'scheduled-maintenance',
    name: 'Техническое обслуживание',
    description:
      'Замена масла и фильтров с проверкой основных узлов по регламенту производителя.',
    category: 'Обслуживание',
    durationMinutes: 90,
    priceFrom: 18000,
    sortOrder: 20,
  },
  {
    slug: 'suspension-repair',
    name: 'Ремонт ходовой части',
    description:
      'Диагностика подвески, рулевого управления и устранение обнаруженных неисправностей.',
    category: 'Ремонт',
    durationMinutes: 120,
    priceFrom: 25000,
    sortOrder: 30,
  },
  {
    slug: 'brake-service',
    name: 'Обслуживание тормозов',
    description:
      'Проверка тормозной системы, замена колодок, дисков и рабочей жидкости.',
    category: 'Безопасность',
    durationMinutes: 75,
    priceFrom: 15000,
    sortOrder: 40,
  },
  {
    slug: 'tire-service',
    name: 'Шиномонтаж',
    description:
      'Сезонная замена, балансировка колёс и проверка состояния шин.',
    category: 'Шины',
    durationMinutes: 60,
    priceFrom: 12000,
    sortOrder: 50,
  },
  {
    slug: 'air-conditioning',
    name: 'Диагностика кондиционера',
    description:
      'Проверка герметичности, давления и эффективности климатической системы.',
    category: 'Комфорт',
    durationMinutes: 60,
    priceFrom: 10000,
    sortOrder: 60,
  },
];

const stations = [
  {
    slug: 'm1-center',
    name: 'M1 Центр',
    address: 'проспект Абая, 125',
    phone: '+7 700 001 01 01',
  },
  {
    slug: 'm1-east',
    name: 'M1 Восток',
    address: 'улица Сыганак, 18',
    phone: '+7 700 001 02 02',
  },
  {
    slug: 'm1-industrial',
    name: 'M1 Industrial',
    address: 'проспект Тауелсиздик, 47',
    phone: '+7 700 001 03 03',
  },
];

const workPostTypes = [
  {
    slug: 'universal',
    name: 'Универсальный',
    description: 'Пост для технического обслуживания и общего ремонта.',
  },
  {
    slug: 'diagnostics',
    name: 'Диагностический',
    description: 'Пост с оборудованием для компьютерной диагностики.',
  },
  {
    slug: 'tire',
    name: 'Шиномонтажный',
    description: 'Пост для шиномонтажа и балансировки колёс.',
  },
  {
    slug: 'alignment',
    name: 'Развал-схождение',
    description: 'Пост со стендом регулировки углов установки колёс.',
  },
];

const workPosts = [
  {
    stationSlug: 'm1-center',
    typeSlug: 'universal',
    code: 'U-01',
    name: 'Универсальный пост 1',
    sortOrder: 10,
    serviceSlugs: [
      'scheduled-maintenance',
      'suspension-repair',
      'brake-service',
    ],
  },
  {
    stationSlug: 'm1-center',
    typeSlug: 'universal',
    code: 'U-02',
    name: 'Универсальный пост 2',
    sortOrder: 20,
    serviceSlugs: [
      'scheduled-maintenance',
      'suspension-repair',
      'brake-service',
    ],
  },
  {
    stationSlug: 'm1-center',
    typeSlug: 'diagnostics',
    code: 'D-01',
    name: 'Диагностический пост',
    sortOrder: 30,
    serviceSlugs: ['computer-diagnostics', 'air-conditioning'],
  },
  {
    stationSlug: 'm1-east',
    typeSlug: 'universal',
    code: 'U-01',
    name: 'Универсальный пост',
    sortOrder: 10,
    serviceSlugs: ['scheduled-maintenance'],
  },
  {
    stationSlug: 'm1-east',
    typeSlug: 'diagnostics',
    code: 'D-01',
    name: 'Диагностический пост',
    sortOrder: 20,
    serviceSlugs: ['computer-diagnostics', 'air-conditioning'],
  },
  {
    stationSlug: 'm1-east',
    typeSlug: 'tire',
    code: 'T-01',
    name: 'Шиномонтажный пост',
    sortOrder: 30,
    serviceSlugs: ['tire-service'],
  },
  {
    stationSlug: 'm1-industrial',
    typeSlug: 'universal',
    code: 'U-01',
    name: 'Универсальный пост 1',
    sortOrder: 10,
    serviceSlugs: ['suspension-repair', 'brake-service'],
  },
  {
    stationSlug: 'm1-industrial',
    typeSlug: 'universal',
    code: 'U-02',
    name: 'Универсальный пост 2',
    sortOrder: 20,
    serviceSlugs: ['suspension-repair', 'brake-service'],
  },
  {
    stationSlug: 'm1-industrial',
    typeSlug: 'diagnostics',
    code: 'D-01',
    name: 'Диагностический пост',
    sortOrder: 30,
    serviceSlugs: ['computer-diagnostics'],
  },
  {
    stationSlug: 'm1-industrial',
    typeSlug: 'tire',
    code: 'T-01',
    name: 'Шиномонтажный пост',
    sortOrder: 40,
    serviceSlugs: ['tire-service'],
  },
];

async function main() {
  const createdServices = new Map();
  const createdStations = new Map();
  const createdWorkPostTypes = new Map();

  for (const service of services) {
    const saved = await prisma.service.upsert({
      where: { slug: service.slug },
      update: service,
      create: service,
    });
    createdServices.set(saved.slug, saved);
  }

  for (const station of stations) {
    const saved = await prisma.station.upsert({
      where: { slug: station.slug },
      update: station,
      create: station,
    });
    createdStations.set(saved.slug, saved);
  }

  for (const type of workPostTypes) {
    const saved = await prisma.workPostType.upsert({
      where: { slug: type.slug },
      update: type,
      create: type,
    });
    createdWorkPostTypes.set(saved.slug, saved);
  }

  const assignments = [
    ['m1-center', 'computer-diagnostics'],
    ['m1-center', 'scheduled-maintenance'],
    ['m1-center', 'suspension-repair'],
    ['m1-center', 'brake-service'],
    ['m1-center', 'air-conditioning'],
    ['m1-east', 'computer-diagnostics'],
    ['m1-east', 'scheduled-maintenance'],
    ['m1-east', 'tire-service'],
    ['m1-east', 'air-conditioning'],
    ['m1-industrial', 'computer-diagnostics'],
    ['m1-industrial', 'suspension-repair'],
    ['m1-industrial', 'brake-service'],
    ['m1-industrial', 'tire-service'],
  ];

  for (const [stationSlug, serviceSlug] of assignments) {
    const station = createdStations.get(stationSlug);
    const service = createdServices.get(serviceSlug);

    await prisma.stationService.upsert({
      where: {
        stationId_serviceId: {
          stationId: station.id,
          serviceId: service.id,
        },
      },
      update: {
        durationMinutes: service.durationMinutes,
        priceFrom: service.priceFrom,
        isActive: true,
      },
      create: {
        stationId: station.id,
        serviceId: service.id,
        durationMinutes: service.durationMinutes,
        priceFrom: service.priceFrom,
      },
    });
  }

  for (const post of workPosts) {
    const station = createdStations.get(post.stationSlug);
    const type = createdWorkPostTypes.get(post.typeSlug);

    const savedPost = await prisma.workPost.upsert({
      where: {
        stationId_code: {
          stationId: station.id,
          code: post.code,
        },
      },
      update: {
        typeId: type.id,
        name: post.name,
        isActive: true,
        sortOrder: post.sortOrder,
      },
      create: {
        stationId: station.id,
        typeId: type.id,
        code: post.code,
        name: post.name,
        sortOrder: post.sortOrder,
      },
    });

    for (const serviceSlug of post.serviceSlugs) {
      const service = createdServices.get(serviceSlug);

      await prisma.workPostService.upsert({
        where: {
          workPostId_serviceId: {
            workPostId: savedPost.id,
            serviceId: service.id,
          },
        },
        update: {
          stationId: station.id,
        },
        create: {
          workPostId: savedPost.id,
          stationId: station.id,
          serviceId: service.id,
        },
      });
    }
  }

  for (const station of createdStations.values()) {
    for (let weekday = 1; weekday <= 6; weekday += 1) {
      const startsMinute = 9 * 60;
      const endsMinute = weekday === 6 ? 17 * 60 : 19 * 60;

      await prisma.stationWorkingPeriod.upsert({
        where: {
          stationId_weekday_startsMinute_endsMinute: {
            stationId: station.id,
            weekday,
            startsMinute,
            endsMinute,
          },
        },
        update: {},
        create: {
          stationId: station.id,
          weekday,
          startsMinute,
          endsMinute,
        },
      });
    }
  }

  await seedAdmin();
}

async function seedAdmin() {
  const login = process.env.ADMIN_LOGIN?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME?.trim();
  const phone = process.env.ADMIN_PHONE?.trim();
  const values = [login, password, name, phone];

  if (values.every((value) => !value)) return;

  if (!login || !password || !name || !phone) {
    throw new Error(
      'Для создания администратора задайте ADMIN_LOGIN, ADMIN_PASSWORD, ADMIN_NAME и ADMIN_PHONE',
    );
  }

  if (!/^[a-z0-9._-]{3,32}$/.test(login)) {
    throw new Error('ADMIN_LOGIN имеет недопустимый формат');
  }

  if (password.length < 8 || password.length > 64) {
    throw new Error('ADMIN_PASSWORD должен содержать от 8 до 64 символов');
  }

  if (name.length < 2 || name.length > 80 || phone.length > 24) {
    throw new Error('Проверьте ADMIN_NAME и ADMIN_PHONE');
  }

  const passwordHash = await hash(password, PASSWORD_HASH_ROUNDS);

  await prisma.user.upsert({
    where: { login },
    update: { name, phone, passwordHash, role: 'ADMIN' },
    create: { login, name, phone, passwordHash, role: 'ADMIN' },
  });
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
