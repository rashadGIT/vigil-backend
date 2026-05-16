# notes

Internal case notes for staff. Notes are never exposed to family members or through the family portal. Any staff member with case access can create, edit, or delete notes.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/cases/:caseId/notes` | List all notes for a case |
| `POST` | `/cases/:caseId/notes` | Add a note to a case |
| `PATCH` | `/notes/:id` | Edit an existing note |
| `DELETE` | `/notes/:id` | Delete a note |

All routes are tenant-scoped via `CognitoAuthGuard`. Queries use `forTenant(tenantId)`.

## Prisma Model: `CaseNote`

| Field | Type | Notes |
|-------|------|-------|
| `id` | String (cuid) | Primary key |
| `tenantId` | String | Multi-tenancy FK |
| `caseId` | String | FK to `Case` |
| `body` | String | Note content (plain text or markdown) |
| `createdBy` | String | FK to `User.id` |
| `createdAt` | DateTime | Auto-set |
| `updatedAt` | DateTime | Auto-updated |

## Integration Points

- **cases** module — notes are scoped to a case; case detail view aggregates them
- **users** module — `createdBy` FK links each note to the authoring staff member
- **family-portal** module — notes are explicitly excluded from all family-facing queries
