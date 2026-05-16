# intake

Public-facing intake form endpoint. No authentication is required. The tenant is identified by the subdomain slug in the URL path rather than a JWT. All database writes happen in a single Prisma transaction to guarantee atomicity.

## HTTP Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/intake/:slug/config` | None (`@Public()`) | Return tenant branding and form configuration for rendering |
| `POST` | `/intake/:slug` | None (`@Public()`) | Submit intake form; creates all linked records atomically |

## Key Service Methods

- `getConfig(slug)` — resolves the tenant by slug and returns branding/config fields needed to render the form
- `submit(slug, dto)` — wraps the following in a single Prisma transaction:
  1. Resolves tenant by slug
  2. Creates `Case`
  3. Creates `FamilyContact` (primary contact from form data)
  4. Creates default `Task` instances from tenant task templates
  5. Creates `FollowUp` schedule entries (1w, 1mo, 6mo, 1yr)
  6. Fires intake notification webhook via N8nModule (outside the transaction, after commit)

## DTOs

- `IntakeSubmitDto` — decedent info, primary contact info, service preferences, optional notes

## Prisma Models Touched

- `Case`
- `FamilyContact`
- `Task`
- `FollowUp`

## Integration Points

- **N8nModule** — triggers the Intake Notification workflow after a successful submit; staff receive an immediate email
- **TasksModule / TaskTemplatesService** — default task set is read from `TaskTemplate` records for the tenant and instantiated as `Task` rows

## Notable Patterns

- CORS is applied per-route via `@Header()` decorators in the controller, not globally, to restrict intake endpoints to the tenant's configured domain
- The entire submit is one Prisma transaction — if any step fails, no partial records are written
- Tenant resolution uses the URL slug, not a JWT; this is the only module where the tenant is identified without an authenticated session
- The `@Public()` decorator opts these routes out of the global `CognitoAuthGuard`
