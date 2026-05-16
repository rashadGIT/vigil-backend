# Follow-Ups Module

Manages grief follow-up schedules per case and exposes an internal endpoint for n8n to mark follow-ups as sent.

## HTTP Endpoints

### Public Controller (`FollowUpsController`) — JWT required

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/cases/:caseId/follow-ups` | List all follow-ups for a case |
| `POST` | `/cases/:caseId/follow-ups` | Manually create a follow-up |
| `PATCH` | `/follow-ups/:id` | Update follow-up status or content |

### Internal Controller (`InternalFollowUpsController`) — `@InternalOnly()` guard

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/internal/follow-ups/trigger` | Called by n8n; marks a follow-up as sent |

## Key Service Methods

- `listByCaseId(tenantId, caseId)` — retrieve all follow-ups for a case
- `create(tenantId, caseId, dto)` — create a follow-up record
- `update(tenantId, id, dto)` — update status or content
- `markSent(followUpId)` — called by internal endpoint; sets `sentAt` timestamp

## Prisma Models

- `FollowUp` — primary model; queried via `forTenant(tenantId)` except in internal `markSent` path

## FollowUpTemplate Enum

| Value | Description |
|-------|-------------|
| `ONE_WEEK` | 1-week post-service check-in |
| `ONE_MONTH` | 1-month grief check-in |
| `SIX_MONTH` | 6-month anniversary outreach |
| `ONE_YEAR` | 1-year anniversary outreach |

Templates are assigned at intake and create scheduled `FollowUp` records automatically.

## Integration Points

- **N8nModule** — `FollowUpsModule` calls `N8nService.triggerGriefFollowup(caseId)` when a follow-up is scheduled; n8n fires back to `/internal/follow-ups/trigger` when sent
- **IntakeModule** — creates initial `FollowUp` records for all four templates on case creation
