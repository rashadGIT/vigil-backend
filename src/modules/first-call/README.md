# first-call

Manages the initial death notification record for a case. Captures the details collected during the first call: decedent identity, time and place of death, the informant's relationship to the decedent, removal logistics, and any special instructions.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/cases/:caseId/first-call` | Get the first call record for a case |
| `POST` | `/cases/:caseId/first-call` | Create the first call record |
| `PATCH` | `/first-call/:id` | Update an existing record |

All routes are tenant-scoped via `CognitoAuthGuard`. Queries use `forTenant(tenantId)`.

## DTOs

- **CreateFirstCallDto** — required fields for initial record creation
- **UpdateFirstCallDto** — partial; all fields optional for updates

## Prisma Model: `FirstCall`

| Field | Type | Notes |
|-------|------|-------|
| `id` | String (cuid) | Primary key |
| `tenantId` | String | Multi-tenancy FK — always present |
| `caseId` | String | FK to `Case` |
| `decedentName` | String | Full legal name |
| `dateOfDeath` | DateTime | Date and time of death |
| `placeOfDeath` | String | Facility, address, or location description |
| `informantName` | String | Name of person making the call |
| `informantRelationship` | String | Relationship to decedent |
| `removalLocation` | String | Where remains are being transferred from |
| `specialInstructions` | String? | Optional notes (religious requests, access codes, etc.) |
| `createdAt` | DateTime | Auto-set |
| `updatedAt` | DateTime | Auto-updated |

## Integration Points

- **cases** module — `caseId` FK; first call record is created immediately after case intake
- **tasks** module — case creation triggers default task generation; first-call completion can mark a task done
- **documents** module — first call data populates the removal authorization PDF
- **n8n** — intake notification workflow reads first call details for the staff alert email
