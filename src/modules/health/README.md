# Health Module

Provides a single liveness endpoint for the ECS Fargate ALB target group health check.

## HTTP Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/health` | `@Public()` | Returns `{ status: 'ok' }` with HTTP 200 |

## Behavior

- No database queries
- No authentication required
- Response is always `{ status: 'ok' }` — no additional fields
- If the process is up and the endpoint responds, the ALB considers the target healthy

## Integration Points

- **AWS ALB** — target group health check is configured to `GET /health`; an unhealthy response causes ECS to replace the task
