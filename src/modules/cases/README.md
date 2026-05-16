# cases

Core domain entity. A `Case` represents a single funeral service engagement. Every other entity — contacts, tasks, documents, payments — is anchored to a case. All queries are tenant-scoped via `forTenant(tenantId)`.

## HTTP Endpoints

### Public Controller (`CasesController`)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/cases` | List cases with filtering and pagination |
| `POST` | `/cases` | Create a new case |
| `GET` | `/cases/:id` | Case detail including related contacts, tasks, and documents |
| `PATCH` | `/cases/:id` | Update case fields, status, or stage |
| `DELETE` | `/cases/:id` | Soft delete — sets `deletedAt` |

### Internal Controller (`InternalCasesController`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `PATCH` | `/internal/cases/:id` | `@InternalOnly()` | n8n callback to update case state |

## Key Service Methods

- `findAll(tenantId, filterDto)` — filtered, paginated list; supports status, stage, and free-text search
- `findOne(tenantId, id)` — case detail with eager-loaded relations
- `create(tenantId, dto)` — creates the case record and triggers the staff notification n8n webhook
- `update(tenantId, id, dto)` — patches allowed fields; handles status and stage transitions
- `softDelete(tenantId, id)` — sets `deletedAt`; case enters the 90-day recoverable window

## DTOs

- `CreateCaseDto` — decedent info, service type, assigned staff, initial status
- `UpdateCaseDto` — partial of CreateCaseDto plus status and stage fields
- `CaseFilterDto` — status, stage, search string, page, limit

## Enums

- `CaseStatus`: `PENDING` | `ACTIVE` | `COMPLETED` | `ARCHIVED`
- `CaseStage`: progression through service stages (arrangement → preparation → service → follow-up)

## Prisma Models Touched

- `Case` (primary)
- Relations read on detail: `FamilyContact`, `Task`, `Document`

## Integration Points

- **N8nModule** — `create` fires a staff notification webhook after the case record is persisted
- **ContactsModule** — contacts are child records linked by `caseId`
- **TasksModule** — default task set is created from templates when a case is opened
- **DocumentsModule** — documents are linked by `caseId`
- **InternalOnly guard** — n8n uses a shared secret header (not Cognito) to call the internal controller

## Notable Patterns

### Soft Delete Lifecycle
```
deletedAt set  →  90-day recoverable window
archivedAt set →  7-year archived (legal retention)
hard delete    →  after 7 years (Data Retention n8n workflow)
```

- `findAll` excludes records where `deletedAt IS NOT NULL` by default
- A separate admin endpoint can query archived cases within the retention window
- The internal controller exists solely so n8n can update case state without a Cognito token — it validates a shared secret header via `@InternalOnly()`
