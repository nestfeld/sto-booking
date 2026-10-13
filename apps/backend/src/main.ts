import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const corsOrigins = (process.env.CORS_ORIGIN ?? 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim());

  app.enableCors({ origin: corsOrigins, credentials: true });
  app.enableShutdownHooks();

  await app.listen(Number(process.env.PORT ?? 5000), '0.0.0.0');
}
await bootstrap();
