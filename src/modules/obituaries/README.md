# Obituaries Module

Manages obituary content for a case, supporting draft, publication, and archival lifecycle states.

## HTTP Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/cases/:caseId/obituary` | Get obituary record for a case |
| `POST` | `/cases/:caseId/obituary` | Create obituary for a case |
| `PATCH` | `/obituaries/:id` | Update obituary content or status |

All endpoints require a valid Cognito JWT (`CognitoAuthGuard` applied globally).

## Key Service Methods

- `findByCaseId(tenantId, caseId)` — retrieve obituary scoped to tenant and case
- `create(tenantId, caseId, dto)` — create obituary record in `draft` status
- `update(tenantId, id, dto)` — update content fields or transition status

## Prisma Models

- `Obituary` — primary model; queried exclusively via `forTenant(tenantId)`

## Status Enum

| Value | Description |
|-------|-------------|
| `draft` | In progress, not visible externally |
| `published` | Finalized and visible |
| `archived` | No longer active |

## Integration Points

- **CasesModule** — validates `caseId` exists and belongs to tenant before write operations
