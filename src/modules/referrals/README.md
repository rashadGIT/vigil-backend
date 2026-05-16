# referrals

**Phase 2 — not yet implemented.**

Tracks referral source attribution for cases. Used to measure which channels — hospital, hospice, church, funeral director network, word of mouth, online search, etc. — are generating business for the funeral home.

## Planned Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/referrals` | List referral sources for tenant |
| `POST` | `/referrals` | Create a referral source |
| `PATCH` | `/referrals/:id` | Update a referral source |
| `DELETE` | `/referrals/:id` | Remove a referral source |
| `GET` | `/cases/:caseId/referral` | Get the referral source for a case |
| `POST` | `/cases/:caseId/referral` | Assign a referral source to a case |

## Planned Prisma Models

- `ReferralSource` — tenant-level catalog of sources (name, type, contact info)
- `CaseReferral` — join between a case and a referral source

## Status

Route stubs exist. Business logic and Prisma models are not implemented. Analytics reporting on referral data is deferred to Phase 3.
