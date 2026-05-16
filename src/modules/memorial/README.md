# memorial

**Phase 2 — not yet implemented.**

Manages public-facing memorial pages for decedents. Each page can include a photo, biography, service details, and a guestbook for condolences. Pages are accessible without authentication via a public GET endpoint.

## Planned Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/memorial/:slug` | Public — retrieve a memorial page by slug |
| `POST` | `/cases/:caseId/memorial` | Create a memorial page for a case (staff) |
| `PATCH` | `/memorial/:id` | Update page content (staff) |
| `DELETE` | `/memorial/:id` | Remove a memorial page (staff) |
| `POST` | `/memorial/:id/guestbook` | Public — submit a guestbook entry |

## Planned Prisma Models

- `MemorialPage` — tied to a `Case`; fields: slug, biography, photoUrl, published, publishedAt
- `GuestbookEntry` — tied to a `MemorialPage`; fields: authorName, message, approved, createdAt

## Status

Route stubs exist. The public GET endpoint requires no auth guard — this exemption must be explicitly configured when implementing. Guestbook moderation logic is deferred to Phase 2.
