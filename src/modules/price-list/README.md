# Price List Module

Manages the FTC Funeral Rule General Price List (GPL) for a tenant — CRUD for line items and an audit log for FTC compliance. PDF generation for the GPL is delegated to DocumentsModule.

## HTTP Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/price-list` | Get all active price list items for the tenant |
| `POST` | `/price-list` | Create a price list item |
| `PATCH` | `/price-list/:id` | Update price or description |
| `DELETE` | `/price-list/:id` | Remove a price list item |
| `GET` | `/price-list/audit` | Retrieve change audit log for FTC compliance review |

All endpoints require a valid Cognito JWT (`CognitoAuthGuard` applied globally).

## Key Service Methods

- `list(tenantId)` — all active items for tenant
- `create(tenantId, dto)` — create item; writes audit log entry
- `update(tenantId, id, dto)` — update price/description; writes audit log entry with previous values
- `remove(tenantId, id)` — delete item; writes audit log entry
- `getAuditLog(tenantId)` — all `PriceListAuditLog` records for tenant, newest first

## Prisma Models

- `PriceListItem` — price list line item; scoped via `forTenant(tenantId)`
- `PriceListAuditLog` — immutable log of all create/update/delete operations with `changedBy`, `changedAt`, and previous/new values

## PriceCategory Enum

| Value |
|-------|
| `BASIC_SERVICES` |
| `CASKETS` |
| `OUTER_BURIAL` |
| `TRANSPORTATION` |
| `PREPARATION` |
| `MERCHANDISE` |
| `FACILITIES` |
| `OTHER` |

## Integration Points

- **DocumentsModule** — calls `PriceListService.list(tenantId)` to populate GPL PDF content; exposes an internal endpoint to trigger generation
