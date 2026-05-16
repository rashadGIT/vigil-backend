# super-admin

Cross-tenant administration. All routes in this module require `custom:role = SUPER_ADMIN` in the Cognito JWT. The `@SuperAdminOnly()` guard is applied at the controller level and validates this claim on every request — it is not sufficient to have a tenant-level admin role.

Standard `CognitoAuthGuard` still runs first; `@SuperAdminOnly()` is an additional layer.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/super-admin/tenants` | List all tenants |
| `POST` | `/super-admin/tenants` | Provision a new tenant |
| `PATCH` | `/super-admin/tenants/:id` | Update tenant configuration |
| `GET` | `/super-admin/users` | List all users across all tenants |
| `POST` | `/super-admin/users/:id/impersonate` | Issue a scoped token for a specific tenant |

## Prisma Models

### `Tenant`

| Field | Type | Notes |
|-------|------|-------|
| `id` | String (cuid) | Primary key; used as `tenantId` throughout |
| `slug` | String | URL-safe identifier (e.g., `riverside-funeral`) |
| `name` | String | Display name |
| `plan` | Enum | `starter`, `professional`, `enterprise` |
| `active` | Boolean | Soft-disable without deletion |
| `config` | Json | Feature flags, branding overrides, etc. |
| `createdAt` | DateTime | Auto-set |
| `updatedAt` | DateTime | Auto-updated |

### `User`

Queried across all tenants from this module (no `forTenant()` filter — intentional super-admin privilege).

| Field | Type | Notes |
|-------|------|-------|
| `id` | String (cuid) | Primary key |
| `tenantId` | String | FK to `Tenant` |
| `cognitoSub` | String | Cognito user sub |
| `email` | String | Unique |
| `role` | Enum | `OWNER`, `ADMIN`, `STAFF`, `SUPER_ADMIN` |
| `active` | Boolean | Whether the user can log in |

## Impersonation

`POST /super-admin/users/:id/impersonate` returns a short-lived, tenant-scoped token. This token grants the caller the same permissions as the target user within that tenant. All impersonation events are logged.

## Security Notes

- This module must never be called from frontend code directly. It is backend-to-backend or CLI only.
- The `@SuperAdminOnly()` guard reads `custom:role` from the verified Cognito JWT. If the claim is absent or not `SUPER_ADMIN`, the request is rejected with `403`.
- No `forTenant()` filter is used here — this is the only module with that exemption.
