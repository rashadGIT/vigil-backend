# Cremation Auth Module

Manages cremation authorization forms per case — tracks authorization status and links to digital signature capture via SignaturesModule.

## HTTP Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/cases/:caseId/cremation-auth` | Get the cremation authorization record for a case |
| `POST` | `/cases/:caseId/cremation-auth` | Create an authorization record |
| `PATCH` | `/cremation-auth/:id` | Update authorization status |

All endpoints require a valid Cognito JWT (`CognitoAuthGuard` applied globally).

## Key Service Methods

- `findByCaseId(tenantId, caseId)` — retrieve authorization record for case
- `create(tenantId, caseId, dto)` — create record in `pending` status; calls `SignaturesService.createRequest` to generate a sign link for `CREMATION_AUTH` document type
- `update(tenantId, id, dto)` — update status fields

## Prisma Models

- `CremationAuthorization` — one-to-one with `Case`; fields include `authorizedBy`, `relationship`, `status`, `signatureId`; queried via `forTenant(tenantId)`

## Status Enum

| Value | Description |
|-------|-------------|
| `pending` | Authorization created; awaiting signature |
| `signed` | Digitally signed via SignaturesModule |
| `denied` | Authorization refused |

## Integration Points

- **SignaturesModule** — `create` triggers a `CREMATION_AUTH` signature request; `signatureId` is stored on the authorization record. When the signature is submitted, `CremationAuthService.update` transitions status to `signed`
- **CasesModule** — validates `caseId` exists and belongs to tenant before write operations
