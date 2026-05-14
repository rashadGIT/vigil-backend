import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import serverlessExpress from '@codegenie/serverless-express';
import helmet from 'helmet';
import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import { AppModule } from './app.module';
import type { Handler } from 'aws-lambda';

let handler: Handler;

async function loadSecrets(): Promise<void> {
  const client = new SecretsManagerClient({ region: process.env.AWS_REGION ?? 'us-east-2' });

  if (!process.env.DATABASE_URL) {
    const res = await client.send(new GetSecretValueCommand({ SecretId: 'vigil/rds/credentials' }));
    const s = JSON.parse(res.SecretString!);
    process.env.DATABASE_URL =
      `postgresql://${s.username}:${encodeURIComponent(s.password)}` +
      `@${s.host}:${s.port}/${s.dbname}?connection_limit=1&connect_timeout=10`;
  }

  if (!process.env.COGNITO_USER_POOL_ID || !process.env.COGNITO_CLIENT_ID) {
    const res = await client.send(new GetSecretValueCommand({ SecretId: 'vigil/cognito/config' }));
    const c = JSON.parse(res.SecretString!);
    process.env.COGNITO_USER_POOL_ID = c.userPoolId;
    process.env.COGNITO_CLIENT_ID = c.clientId;
  }
}

export const lambdaHandler: Handler = async (event, context, callback) => {
  if (!handler) {
    await loadSecrets();

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
