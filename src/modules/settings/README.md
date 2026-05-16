# Settings Module

Stores and manages per-tenant configuration — one settings record per tenant, editable only by users with the `ADMIN` role.

## HTTP Endpoints

| Method | Path | Role Required | Description |
|--------|------|---------------|-------------|
| `GET` | `/settings` | Any authenticated | Get all settings for the tenant |
| `PATCH` | `/settings` | `ADMIN` | Update tenant settings |

All endpoints require a valid Cognito JWT. `PATCH` additionally enforces `ADMIN` role via role guard.

## Key Service Methods

- `getByTenant(tenantId)` — retrieve the `TenantSettings` record; creates defaults on first access if not yet seeded
- `update(tenantId, dto)` — merge `UpdateSettingsDto` fields into existing record

## Prisma Models

- `TenantSettings` — 1:1 with `Tenant`; queried via `forTenant(tenantId)`

## Configurable Fields

| Field | Description |
|-------|-------------|
| `funeralHomeName` | Display name |
| `logoUrl` | S3 URL for tenant logo |
| `primaryColor` | Hex color for branded documents |
| `phone` | Main contact phone |
| `address` | Physical address |
| `stateLicenseNumber` | State funeral home license |
| `defaultTaskTemplatesEnabled` | Auto-create task checklist on new case |
| `emailPreferences` | Object — which notification emails are active |

## Integration Points

- **DocumentsModule** — reads `funeralHomeName`, `logoUrl`, and `primaryColor` when generating PDFs
- **IntakeModule** — reads `defaultTaskTemplatesEnabled` to determine whether to auto-create tasks
