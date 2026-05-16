# N8n Module

Handles all outbound triggers to n8n cloud workflows and receives inbound callbacks from n8n via a shared-secret-protected internal endpoint.

## HTTP Endpoints

### Callback Controller (`N8nCallbackController`) — `@InternalOnly()` guard

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/n8n/callback` | Receives event callbacks from n8n workflows |

No JWT is used on this endpoint — authentication is a shared secret header validated by `@InternalOnly()`.

## Key Service Methods (`N8nService`)

| Method | Triggers Workflow |
|--------|------------------|
| `triggerGriefFollowup(caseId)` | Grief Follow-Up Scheduler |
| `triggerStaffNotify(event, payload)` | Staff Notification Hub |
| `triggerIntakeNotify(caseId)` | Intake Notification |
| `triggerDocGenerate(caseId, docType)` | Document Generation |
| `triggerReviewRequest(caseId)` | Review Request |

All methods fire `HTTP POST` to configured n8n webhook URLs. If a URL is still a placeholder, the service logs a `WARN` and returns without throwing — callers are not blocked.

## N8nEventsEnum

Defines string constants for event types passed to `triggerStaffNotify`:

- `CASE_CREATED`
- `TASK_OVERDUE`
- `VENDOR_CONFIRMED`
- `DOCUMENT_READY`

## Workflows Directory

`workflows/` contains n8n-as-code workflow definition files loaded by the `n8nac` CLI for version-controlled workflow deployment.

| Workflow | Description |
|----------|-------------|
| Grief Follow-Up Scheduler | 1w, 1mo, 6mo, 1yr emails post-service |
| Staff Notification Hub | New case, overdue tasks, vendor confirmations |
| Intake Notification | Immediate staff email on intake submit |
| Document Generation | Service program PDF on case complete |
| Data Retention Cleanup | Monthly hard-delete after 7-year archive |
| Review Request | Google review SMS + email 14 days post-service |

## Integration Points

- **FollowUpsModule** — calls `triggerGriefFollowup` when follow-ups are scheduled
- **IntakeModule** — calls `triggerIntakeNotify` on successful intake submission
- **CasesModule** — calls `triggerStaffNotify` on case creation and status changes
- **DocumentsModule** — calls `triggerDocGenerate` when a PDF is requested
- n8n cloud instance: `rashadbarnett.app.n8n.cloud`
