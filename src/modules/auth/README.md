# auth

Handles Cognito token exchange, session management, and user bootstrapping. Provides `CognitoAuthGuard`, which is applied globally across the application.

## HTTP Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/auth/login` | Exchange Cognito auth code for access/refresh tokens |
| `GET` | `/auth/me` | Return current user from JWT claims |
| `POST` | `/auth/logout` | Clear session / revoke tokens |

## Key Service Methods

- `login(code)` — exchanges the Cognito authorization code for tokens; calls `syncUser()` on first login
- `syncUser(cognitoSub, claims)` — upserts the `User` record keyed on `cognitoSub`; creates the record if it does not exist
- `getMe(userId)` — retrieves the authenticated user from the database
- `logout(token)` — revokes the Cognito refresh token

## Prisma Models Touched

- `User` — read and upserted during login sync

## Integration Points

- **CognitoAuthGuard** — JWT verification guard exported from this module and applied globally; checks `DEV_AUTH_BYPASS` env first in local dev
- **EmailModule** — sends transactional email on account events (e.g., first login welcome)
- **Cognito User Pool** — all token exchange calls target the configured Cognito endpoint

## Notable Patterns

- `cognitoSub` is the stable identifier linking Cognito to the internal `User` record; it is written once on first login and never changed
- `DEV_AUTH_BYPASS=true` short-circuits guard logic in local dev — injects a mock user from the `x-dev-user` request header
- All protected routes require a valid Cognito JWT; `@Public()` decorator opts a route out of the global guard (used by the intake module)
