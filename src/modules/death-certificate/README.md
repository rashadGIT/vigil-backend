# Death Certificate Module

Tracks death certificate filing status and metadata per case — one record per case.

## HTTP Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/cases/:caseId/death-certificate` | Get the death certificate record for a case |
| `POST` | `/cases/:caseId/death-certificate` | Create a death certificate record |
| `PATCH` | `/death-certificate/:id` | Update fields or filing status |

All endpoints require a valid Cognito JWT (`CognitoAuthGuard` applied globally).

## Key Service Methods

- `findByCaseId(tenantId, caseId)` — retrieve record for case
- `create(tenantId, caseId, dto)` — create record
- `update(tenantId, id, dto)` — update filing fields or status

## Prisma Models

- `DeathCertificate` — one-to-one with `Case`; queried via `forTenant(tenantId)`

## Record Fields

| Field | Description |
|-------|-------------|
| `filingDate` | Date certificate was filed |
| `filedBy` | Staff member who filed |
| `certificateNumber` | Issued certificate number |
| `state` | State where filed |
| `copiesOrdered` | Number of certified copies ordered |
| `status` | `PENDING`, `FILED`, `RECEIVED` |

## Integration Points

- **CasesModule** — validates `caseId` exists and belongs to tenant before write operations
