# contacts

Family contacts associated with a case. Each contact has a typed role (primary contact, next of kin, authorized signer, etc.) and belongs to exactly one `Case`. All queries are tenant-scoped via `forTenant(tenantId)`.

## HTTP Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/cases/:caseId/contacts` | List all contacts for a case |
| `POST` | `/cases/:caseId/contacts` | Add a contact to a case |
| `PATCH` | `/contacts/:id` | Update contact details or type |
| `DELETE` | `/contacts/:id` | Remove a contact |

## Key Service Methods

- `findAll(tenantId, caseId)` — returns all contacts for the given case; validates the case belongs to the tenant
- `create(tenantId, caseId, dto)` — creates a contact linked to the case
- `update(tenantId, id, dto)` — patches contact fields
- `remove(tenantId, id)` — deletes the contact record (hard delete — contacts have no independent retention requirement)

## DTOs

- `CreateContactDto` — firstName, lastName, relationship, contactType, phone, email, address
- `UpdateContactDto` — partial of CreateContactDto

## Enums

- `ContactType`: `PRIMARY_CONTACT` | `NEXT_OF_KIN` | `AUTHORIZED_SIGNER` | `EMERGENCY_CONTACT` | `OTHER`

## Prisma Models Touched

- `FamilyContact`

## Integration Points

- **CasesModule** — contacts are always accessed through a case; `caseId` is validated against the tenant before any operation
- **IntakeModule** — the intake flow creates the initial primary contact inside the same transaction as the case

## Notable Patterns

- Case ownership is verified before every contact operation: if the `Case` with `caseId` does not belong to the tenant, the request is rejected with `403`
- Contacts do not have their own soft delete — removal is immediate; the parent case record carries the retention obligation
- A case may have multiple contacts of different types but only one `PRIMARY_CONTACT`
