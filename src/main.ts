import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

const sentryDsn = process.env.SENTRY_DSN;
if (sentryDsn && process.env.NODE_ENV !== 'test') {
  // Dynamic import so Sentry + OpenTelemetry only load when DSN is configured
  import('@sentry/node').then(({ init }) => {
    init({
      dsn: sentryDsn,
      environment: process.env.NODE_ENV ?? 'development',
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0,
    });
  }).catch((err: unknown) => {
    Logger.warn(`Sentry init failed: ${(err as Error).message}`, 'Bootstrap');
  });
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
  });

  // Security headers
  app.use(helmet());

  // Global validation — whitelist strips unknown props, forbidNonWhitelisted throws on extras
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Dashboard CORS — credentialed, specific origins (D-14)
  app.enableCors({
    origin: [
      'https://app.kelovaapp.com',
      /\.kelovaapp\.com$/,
      /\.amplifyapp\.com$/,
      'http://localhost:3000',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-dev-user', 'x-kelova-internal-key'],
  });
  // Intake endpoint CORS is applied per-route via @Header() in intake.controller.ts

  // Swagger — always available
  const config = new DocumentBuilder()
    .setTitle('Kelova API')
    .setDescription('Funeral Home Operations Platform')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = parseInt(process.env.PORT ?? '3001', 10);
  await app.listen(port);
  Logger.log(`Kelova API listening on http://localhost:${port}`, 'Bootstrap');
}

void bootstrap();
