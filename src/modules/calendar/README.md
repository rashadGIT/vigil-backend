# Calendar Module

Manages service event scheduling for a tenant — visitations, funeral services, graveside committal, and memorials.

## HTTP Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/calendar` | List events for the tenant; optional `?from` and `?to` date range query params |
| `POST` | `/calendar` | Create a calendar event |
| `PATCH` | `/calendar/:id` | Update event details |
| `DELETE` | `/calendar/:id` | Remove an event |

All endpoints require a valid Cognito JWT (`CognitoAuthGuard` applied globally).

## Key Service Methods

- `list(tenantId, from?, to?)` — events within optional date range, ordered by `startsAt`
- `create(tenantId, dto)` — create `CalendarEvent` record
- `update(tenantId, id, dto)` — update event fields
- `remove(tenantId, id)` — delete event

## Prisma Models

- `CalendarEvent` — primary model; fields include `caseId` (optional), `type`, `title`, `location`, `startsAt`, `endsAt`, `notes`; queried via `forTenant(tenantId)`

## EventType Enum

| Value |
|-------|
| `VISITATION` |
| `FUNERAL` |
| `GRAVESIDE` |
| `MEMORIAL` |
| `OTHER` |

## Integration Points

- **CasesModule** — `caseId` on `CalendarEvent` is optional; when present, validates case belongs to tenant
