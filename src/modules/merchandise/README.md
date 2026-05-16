# merchandise

Manages the tenant's merchandise catalog and tracks which items are selected for each case. Covers caskets, urns, vaults, and other funeral merchandise. Supports FTC GPL compliance by keeping catalog items tied to published price lists.

## Endpoints

### Catalog

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/merchandise` | List all catalog items for the tenant |
| `POST` | `/merchandise` | Add a new item to the catalog |
| `PATCH` | `/merchandise/:id` | Update an existing catalog item |
| `DELETE` | `/merchandise/:id` | Remove an item from the catalog |

### Case Selections

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/cases/:caseId/merchandise` | List merchandise selected for a case |
| `POST` | `/cases/:caseId/merchandise/:itemId` | Add a catalog item to a case |

All routes are tenant-scoped via `CognitoAuthGuard`. Queries use `forTenant(tenantId)`.

## Prisma Models

### `MerchandiseItem`

| Field | Type | Notes |
|-------|------|-------|
| `id` | String (cuid) | Primary key |
| `tenantId` | String | Multi-tenancy FK |
| `name` | String | Display name |
| `description` | String? | Optional description |
| `price` | Decimal | Retail price |
| `category` | String | e.g., `casket`, `urn`, `vault`, `outer burial container` |
| `sku` | String? | Vendor SKU |
| `available` | Boolean | Whether item is currently active in the catalog |
| `createdAt` | DateTime | Auto-set |
| `updatedAt` | DateTime | Auto-updated |

### `CaseMerchandise`

Join table linking a case to selected catalog items.

| Field | Type | Notes |
|-------|------|-------|
| `id` | String (cuid) | Primary key |
| `tenantId` | String | Multi-tenancy FK |
| `caseId` | String | FK to `Case` |
| `merchandiseItemId` | String | FK to `MerchandiseItem` |
| `priceAtSelection` | Decimal | Snapshot of price at time of selection |
| `quantity` | Int | Default 1 |
| `notes` | String? | Staff notes for this line item |
| `selectedAt` | DateTime | Auto-set |

## Integration Points

- **price-list** module — merchandise items are linked to GPL price lists for FTC compliance
- **cases** module — `caseId` FK; case summary includes selected merchandise
- **documents** module — selected merchandise populates the statement of goods PDF
- **payments** module — `CaseMerchandise` line items feed the invoice total
