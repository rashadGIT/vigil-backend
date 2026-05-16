# preneed

Manages pre-need arrangement contracts — funeral planning completed before death occurs. Contracts move through a defined status lifecycle and can be promoted to an active case when the arrangement is needed.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/preneed` | List all pre-need contracts for the tenant |
| `GET` | `/preneed/:id` | Get a single contract |
| `POST` | `/preneed` | Create a new contract |
| `PATCH` | `/preneed/:id` | Update a contract |

All routes are tenant-scoped via `CognitoAuthGuard`. Queries use `forTenant(tenantId)`.

## Prisma Model: `PreneedContract`

| Field | Type | Notes |
|-------|------|-------|
| `id` | String (cuid) | Primary key |
| `tenantId` | String | Multi-tenancy FK |
| `contractNumber` | String | Human-readable contract ID |
| `contractHolderName` | String | Person purchasing the contract |
| `beneficiaryName` | String | Person the arrangement is for |
| `status` | Enum | See status lifecycle below |
| `selectedMerchandise` | Json? | Snapshot of merchandise selections at contract time |
| `totalAmount` | Decimal | Contract value |
| `notes` | String? | Staff notes |
| `convertedCaseId` | String? | FK to `Case` once converted |
| `createdAt` | DateTime | Auto-set |
| `updatedAt` | DateTime | Auto-updated |

## Status Lifecycle

| Status | Meaning |
|--------|---------|
| `inquiry` | Initial contact; contract not yet signed |
| `in-progress` | Active negotiation or paperwork in progress |
| `completed` | Signed and funded; awaiting need |
| `converted` | Arrangement has been activated as a live case |

## Integration Points

- **cases** module — a completed preneed contract can be converted to a `Case`; `convertedCaseId` links the two records
- **merchandise** module — merchandise selections are snapshotted at the time of contract creation
- **contacts** module — contract holder and beneficiary may be linked to `FamilyContact` records
- **documents** module — pre-need contract PDF can be generated and stored in S3
