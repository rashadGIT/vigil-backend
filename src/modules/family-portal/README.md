# family-portal

**Phase 2 — not yet implemented (backend stub).**

Provides families with a limited, authenticated view into their case. Staff grant access by issuing a time-limited token to a family member's email address. The portal allows families to view case status, review documents, and sign pending signature requests — without creating a Cognito account.

## Planned Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/family-portal/grant` | Issue a portal access token to a family member |
| `GET` | `/family-portal/case` | Family view of case status (token-authenticated) |
| `GET` | `/family-portal/documents` | List documents available for family review |

## DTO

**GrantPortalDto**

| Field | Type | Notes |
|-------|------|-------|
| `caseId` | String | The case to grant access to |
| `email` | String | Family member's email address |
| `expiresInHours` | Number | Token TTL; defaults to 72 hours |

## Access Model

- `POST /family-portal/grant` is staff-only (requires `CognitoAuthGuard`)
- All other family-portal endpoints authenticate via the issued access token, not Cognito — a separate token-validation guard will be implemented in Phase 2
- Portal access is read-only except for signature requests

## Integration Points

- **signatures** module — family can complete e-signature requests through the portal
- **documents** module — approved documents are surfaced to the family view
- **cases** module — case status is the primary data shown

## Status

`POST /family-portal/grant` stub exists and returns a placeholder. Token generation, validation guard, and family-facing endpoints are not implemented.
