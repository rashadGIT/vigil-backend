-- Migration: add_upload_confirm_fields
-- Adds Document.uploaded (boolean, default false) and Signature.checkboxConfirmedAt + Signature.documentHash

ALTER TABLE "documents" ADD COLUMN "uploaded" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "signatures" ADD COLUMN "checkbox_confirmed_at" TIMESTAMP(3);
ALTER TABLE "signatures" ADD COLUMN "document_hash" TEXT;
