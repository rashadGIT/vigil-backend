# Vendors Module

Manages the tenant vendor directory and case-level vendor assignments for external service providers (cremation facilities, florists, cemeteries, etc.).

## HTTP Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/vendors` | List all vendors for the tenant |
| `POST` | `/vendors` | Add a vendor to the tenant directory |
| `PATCH` | `/vendors/:id` | Update vendor details |
| `DELETE` | `/vendors/:id` | Soft-delete a vendor |
| `GET` | `/cases/:caseId/vendors` | List vendors assigned to a specific case |
| `POST` | `/cases/:caseId/vendors/:vendorId` | Assign a vendor to a case |

All endpoints require a valid Cognito JWT (`CognitoAuthGuard` applied globally). Soft-delete sets `deletedAt` — records are retained per the two-stage deletion policy.

## Key Service Methods

- `list(tenantId)` — all active vendors for tenant
- `create(tenantId, dto)` — add vendor
- `update(tenantId, id, dto)` — update vendor record
- `softDelete(tenantId, id)` — set `deletedAt`
- `listByCase(tenantId, caseId)` — vendors assigned to a case via join table
- `assignToCase(tenantId, caseId, vendorId)` — create `CaseVendor` record

## Prisma Models

- `Vendor` — vendor directory entry; scoped to tenant
- `CaseVendor` — join table linking `Vendor` to `Case`

## VendorType Enum

| Value |
|-------|
| `CREMATION` |
| `FLORIST` |
| `CEMETERY` |
| `MONUMENT` |
| `LIMO` |
| `MEDIA` |
| `OTHER` |

## DTO

`VendorDto` fields: `name`, `type` (VendorType), `contactName`, `phone`, `email`, `address`, `notes`.

## Integration Points

- **CasesModule** — validates `caseId` exists and belongs to tenant before assignment
