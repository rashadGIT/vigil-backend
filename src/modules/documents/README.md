# documents

S3 presigned URL upload/download flow and PDFKit-based document generation. Uploads go directly from the client to S3 — the backend never streams file bytes. PDF generation is triggered by n8n via an internal controller.

## HTTP Endpoints

### Public Controller (`DocumentsController`)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/documents/presign` | Get a presigned PUT URL for direct S3 upload |
| `POST` | `/documents/confirm` | Confirm upload complete; create the `Document` record |
| `GET` | `/documents/:id/download` | Get a presigned GET URL for download |
| `DELETE` | `/documents/:id` | Soft delete the document record |

### Internal Controller (`InternalDocumentsController`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/internal/documents/generate-gpl` | `@InternalOnly()` | Generate FTC GPL price list PDF and upload to S3 |
| `POST` | `/internal/documents/generate-program` | `@InternalOnly()` | Generate service program PDF and upload to S3 |

## Key Service Methods

### S3Service
- `getPresignedPutUrl(key, contentType, expiresIn)` — returns a presigned PUT URL; client uploads directly
- `getPresignedGetUrl(key, expiresIn)` — returns a presigned GET URL for download
- `putObject(key, buffer, contentType)` — used internally to upload PDFKit buffers after generation

### PdfService
- `generateGpl(tenantId, data)` — builds the FTC GPL price list; returns `Buffer`
- `generateServiceProgram(caseId, data)` — builds the service program; returns `Buffer`
- Both methods return a `Buffer` — the caller (`InternalDocumentsController`) uploads to S3 via `S3Service.putObject()` and then creates the `Document` record

### DocumentsService
- `presign(tenantId, dto)` — generates the presigned PUT URL and returns the `s3Key` for the confirm step
- `confirm(tenantId, dto)` — creates the `Document` record after the client signals upload completion
- `getDownloadUrl(tenantId, id)` — validates ownership and returns a presigned GET URL
- `softDelete(tenantId, id)` — sets `deletedAt`

## DTOs

- `PresignDto` — filename, contentType, caseId
- `ConfirmDto` — s3Key, documentType, caseId

## Prisma Models Touched

- `Document`

## Integration Points

- **CasesModule** — `Document` records are linked by `caseId`; case ownership is validated before presign and confirm
- **N8nModule / n8n Document Generation workflow** — calls `/internal/documents/generate-gpl` and `/internal/documents/generate-program` on case completion
- **AWS S3** — all file storage; buckets are private; access is always through presigned URLs

## Notable Patterns

- The two-step presign + confirm pattern keeps file bytes off the backend and avoids multipart form parsing
- `PdfService` methods return a raw `Buffer` with no side effects — the controller is responsible for uploading to S3 and writing the `Document` record, keeping the service testable in isolation
- The internal controller uses `@InternalOnly()` (shared secret header, not Cognito) so n8n can trigger PDF generation without a user session
- S3 keys follow the pattern `tenants/{tenantId}/cases/{caseId}/{documentType}/{filename}` to enforce natural prefix-level isolation
