# users

Staff user CRUD for a tenant. All operations are scoped to the authenticated user's `tenantId` via `forTenant()`. Role enforcement is applied at the endpoint level — only `ADMIN` users may create or delete accounts.

## HTTP Endpoints

| Method | Path | Auth / Role | Description |
|--------|------|-------------|-------------|
| `GET` | `/users` | Any staff | List all staff for the tenant |
| `GET` | `/users/:id` | Any staff | Get a single staff user |
| `POST` | `/users` | ADMIN only | Invite / create a new staff user |
| `PATCH` | `/users/:id` | ADMIN only | Update profile fields or role |
| `DELETE` | `/users/:id` | ADMIN only | Soft-delete a staff account |

## Key Service Methods

- `findAll(tenantId)` — returns all non-deleted users for the tenant
- `findOne(tenantId, id)` — returns a single user; throws `NotFoundException` if not found or belongs to another tenant
- `create(tenantId, dto)` — creates a Cognito user invite and writes the `User` record
- `update(tenantId, id, dto)` — patches allowed fields; role changes are gated to ADMIN
- `remove(tenantId, id)` — sets `deletedAt`; does not hard delete

## DTOs

- `CreateUserDto` — email, firstName, lastName, role
- `UpdateUserDto` — partial of CreateUserDto

## Prisma Models Touched

- `User`

## Integration Points

- **AuthModule / CognitoAuthGuard** — all endpoints require a valid JWT
- **RolesGuard** — enforces `ADMIN` role on create and delete endpoints
- **Cognito User Pool** — `create` triggers a Cognito invite email via the AWS SDK

## Notable Patterns

- All queries go through `forTenant(tenantId)` — a user cannot be fetched or mutated across tenant boundaries
- Soft delete only: `deletedAt` is set on removal; the record remains queryable for audit purposes
- Role is stored both in the `User` table and as a `custom:role` Cognito attribute; they are kept in sync on update
