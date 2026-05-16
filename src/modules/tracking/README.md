# tracking

**Phase 2 — not yet implemented.**

Tracks decedent location throughout the preparation process. Covers transfer intake, cold storage, embalming room assignment, and release for service or delivery.

## Planned Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/cases/:caseId/tracking` | Get current location record |
| `POST` | `/cases/:caseId/tracking` | Create initial tracking entry |
| `PATCH` | `/tracking/:id` | Update location or status |
| `GET` | `/tracking` | List all active tracking records for tenant |

## Planned Prisma Model: `DecedentTracking`

Fields will include: `caseId`, `tenantId`, `currentLocation` (enum: `in-transit`, `cold-storage`, `embalming-room`, `chapel`, `released`), `locationNotes`, `updatedBy`, timestamps.

## Status

Route stubs exist. Business logic and Prisma model are not implemented. Do not wire up to the frontend until Phase 2 is active.
