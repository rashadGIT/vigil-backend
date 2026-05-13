import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import serverlessExpress from '@codegenie/serverless-express';
import helmet from 'helmet';
import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import { AppModule } from './app.module';
import type { Handler } from 'aws-lambda';

let handler: Handler;

async function loadDatabaseUrl(): Promise<void> {
  if (process.env.DATABASE_URL) return;

  const client = new SecretsManagerClient({ region: process.env.AWS_REGION ?? 'us-east-2' });
  const res = await client.send(
    new GetSecretValueCommand({ SecretId: 'vigil/rds/credentials' }),
  );
  const s = JSON.parse(res.SecretString!);
  process.env.DATABASE_URL =
    `postgresql://${s.username}:${encodeURIComponent(s.password)}` +
    `@${s.host}:${s.port}/${s.dbname}?connection_limit=1&connect_timeout=10`;
}

export const lambdaHandler: Handler = async (event, context, callback) => {
  if (!handler) {
    await loadDatabaseUrl();

    const app = await NestFactory.create(AppModule);

    app.use(helmet());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
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

    await app.init();
    handler = serverlessExpress({ app: app.getHttpAdapter().getInstance() });
  }

  return handler(event, context, callback);
};
