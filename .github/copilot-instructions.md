# Copilot Agent Instructions

## Project Overview

This is the backend for Kelova — a multi-tenant SaaS platform for independent funeral homes. Built with NestJS, TypeScript strict mode, Prisma ORM, and deployed as AWS Lambda via a zip artifact.

## Stack

- **Framework**: NestJS (strict mode — no `any`, no implicit types)
- **Language**: TypeScript strict
- **ORM**: Prisma with `forTenant()` extension — all queries must go through it
- **DB**: PostgreSQL 16 (RDS)
- **Auth**: AWS Cognito — `CognitoAuthGuard` handles JWT verification
- **Deploy**: AWS Lambda (zip) behind API Gateway
- **Email**: Resend (dev) / SES (prod) via `EMAIL_PROVIDER` env var
- **PDF**: pdfkit → Buffer → S3
- **Async jobs**: n8n only — no BullMQ, no cron in production

## How to Run Locally

```bash
docker-compose up -d
npx prisma migrate dev
npx prisma db seed
DEV_AUTH_BYPASS=true npm run start:dev
```

## Multi-Tenancy (Non-Negotiable)

- Every DB table has `tenantId`
- Every Prisma query must go through `prisma.forTenant(tenantId)`
- Never query across tenants
- `tenantId` comes from the verified JWT or `x-dev-user` header in dev bypass mode

## Auth Patterns

- `@UseGuards(CognitoAuthGuard)` — standard Cognito JWT auth
- `@InternalOnly()` — shared secret header for n8n webhook callbacks
- Dev bypass: `DEV_AUTH_BYPASS=true` injects mock user from `x-dev-user` header

## Code Conventions

- Modules in `src/modules/<name>/` with controller, service, dto, and spec files
- DTOs use `class-validator` decorators — always validate at the boundary
- Services are the only place that touches Prisma — never query from controllers
- Soft delete: set `deletedAt`, not hard delete (90-day recovery window)
- No `console.log` in committed code — use NestJS `Logger`

## Testing Requirements

- Every service method needs a unit test in `*.service.spec.ts`
- Tenant isolation test is mandatory — Tenant A must not access Tenant B data
- Run `npm test` before marking any issue complete
- Run `npm run type-check` to catch TypeScript errors

## When Fixing a Bug

1. Write a failing test that reproduces it
2. Fix the code
3. Confirm the test passes
4. Run `npm run lint`

## When Adding a Feature

1. Add the Prisma schema change + migration first
2. Build the service with tests
3. Wire up the controller with DTOs
4. Do not add npm packages without a clear reason

## Do Not

- Commit `.env` files or secrets
- Use `any` in TypeScript
- Query Prisma without `forTenant()`
- Add `console.log` — use `Logger`
- Use BullMQ, cron jobs, or any async queue other than n8n
- Skip the tenant isolation check in tests
