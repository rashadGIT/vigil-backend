# Cemetery Module

Tracks cemetery placement details per case — one record per case covering lot information, interment date, and permit tracking.

## HTTP Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/cases/:caseId/cemetery` | Get the cemetery record for a case |
| `POST` | `/cases/:caseId/cemetery` | Create a cemetery record |
| `PATCH` | `/cemetery/:id` | Update cemetery record fields |

All endpoints require a valid Cognito JWT (`CognitoAuthGuard` applied globally).

## Key Service Methods

- `findByCaseId(tenantId, caseId)` — retrieve cemetery record for case
- `create(tenantId, caseId, dto)` — create record
- `update(tenantId, id, dto)` — update fields

## Prisma Models

- `CemeteryRecord` — one-to-one with `Case`; queried via `forTenant(tenantId)`

## Record Fields

| Field | Description |
|-------|-------------|
| `cemeteryName` | Name of the cemetery |
| `section` | Cemetery section identifier |
| `lot` | Lot number |
| `graveNumber` | Individual grave number |
| `intermentDate` | Date of interment |
| `permitNumber` | Burial permit number |

## Integration Points

- **CasesModule** — validates `caseId` exists and belongs to tenant before write operations
