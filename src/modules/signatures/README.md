# Signatures Module

Handles e-signature capture for legal documents — generates tokenized sign links, accepts base64 signature images, and stores signed documents to S3.

## HTTP Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/cases/:caseId/signatures` | JWT | List all signature requests for a case |
| `POST` | `/signatures/request` | JWT | Create a signature request; returns a one-time sign link |
| `GET` | `/signatures/:token` | `@Public()` | Return document payload for the signer |
| `POST` | `/signatures/:token/sign` | `@Public()` | Submit base64 signature image; store to S3; mark signed |

## Key Service Methods

- `listByCaseId(tenantId, caseId)` — all signature requests for a case
- `createRequest(tenantId, dto)` — create `Signature` record; generate short-lived token
- `getDocumentByToken(token)` — resolve token to document content (no tenant filter — public)
- `submitSignature(token, signatureImageBase64)` — upload image to S3, set `signedAt`, store S3 key

## Prisma Models

- `Signature` — signature request record; stores token, status, S3 key, `signedAt`
- `Document` — associated document; stores type, content reference, case link

## SignatureDocument Enum

| Value | Description |
|-------|-------------|
| `CREMATION_AUTH` | Cremation authorization form |
| `SERVICE_CONTRACT` | Funeral service agreement |
| `GPL_ACKNOWLEDGMENT` | FTC General Price List acknowledgment |
| `RELEASE_AUTHORIZATION` | Body release authorization |
| `ASSIGNMENT_OF_BENEFITS` | Insurance assignment |

## Integration Points

- **S3** — signed images stored in the tenant documents bucket via presigned PUT
- **CremationAuthModule** — links cremation auth records to a `CREMATION_AUTH` signature request
- **DocumentsModule** — references `Document` records generated for signing
- **esignature-provider.interface.ts** — interface stub for future third-party e-sign provider integration (DocuSign, HelloSign, etc.)
