# payments

Manual payment and invoice line item tracking per case. Records cash, check, and other offline payment methods. There is no external payment gateway — this module is a ledger, not a payment processor.

## HTTP Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/cases/:caseId/payments` | List all payment records for a case |
| `POST` | `/cases/:caseId/payments` | Create a payment or invoice line item |
| `PATCH` | `/payments/:id` | Update a payment record (upsert pattern) |
| `DELETE` | `/payments/:id` | Remove a payment record |

## Key Service Methods

- `findAll(tenantId, caseId)` — returns all payment records for the case; validates case belongs to tenant
- `create(tenantId, caseId, dto)` — creates a payment record linked to the case
- `upsert(tenantId, id, dto)` — updates the payment if it exists; the `PATCH` handler delegates here
- `remove(tenantId, id)` — hard deletes the payment record

## DTOs

- `UpsertPaymentDto` — amount, method (CASH | CHECK | OTHER), description, paidAt, invoiceNumber

## Prisma Models Touched

- `Payment`

## Integration Points

- **CasesModule** — payments are always accessed through a case; case ownership is validated before any operation

## Notable Patterns

- No external gateway integration — all payment entry is manual; the module functions as an internal ledger
- `upsert` pattern on PATCH: if the record is found and belongs to the tenant, it is updated; ownership is validated before the write, not relying on Prisma's own upsert to catch cross-tenant access
- Hard delete is used (no `deletedAt`) — payment records are removed immediately when deleted; case-level soft delete and retention policy cover the audit trail obligation
