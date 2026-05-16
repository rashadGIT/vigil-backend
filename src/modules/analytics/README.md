# Analytics Module

Provides on-demand dashboard metrics and monthly reporting for a tenant — no external analytics service; all data is aggregated from existing tables.

## HTTP Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/analytics/snapshot` | Current period stats for the tenant dashboard |
| `GET` | `/analytics/monthly` | Monthly case volume and revenue for the last 12 months |

All endpoints require a valid Cognito JWT (`CognitoAuthGuard` applied globally).

## Snapshot Response Fields

- `activeCases` — open cases not yet closed
- `revenueMtd` — sum of `Payment.amount` for the current calendar month
- `tasksOverdue` — tasks past due date with status not `COMPLETE`
- `followUpsPending` — follow-ups not yet sent

## Key Service Methods

- `getSnapshot(tenantId)` — runs parallel aggregation queries; returns snapshot DTO
- `getMonthly(tenantId)` — groups case counts and payment sums by month for trailing 12 months

## Prisma Models

| Model | Usage |
|-------|-------|
| `Case` | Count active/closed cases; group by month |
| `Payment` | Sum revenue MTD and monthly |
| `Task` | Count overdue tasks |
| `FollowUp` | Count pending (unsent) follow-ups |

All queries use `forTenant(tenantId)` — no cross-tenant data exposure.

## Integration Points

- No external dependencies — self-contained aggregation over existing module tables
