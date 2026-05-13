-- CreateEnum
CREATE TYPE "MerchandiseCategory" AS ENUM ('casket', 'urn', 'vault', 'clothing', 'flowers', 'stationery', 'other');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'gpl_view';
ALTER TYPE "AuditAction" ADD VALUE 'gpl_sent';

-- DropForeignKey
ALTER TABLE "calendar_events" DROP CONSTRAINT "calendar_events_case_id_fkey";

-- DropForeignKey
ALTER TABLE "case_line_items" DROP CONSTRAINT "case_line_items_case_id_fkey";

-- DropForeignKey
ALTER TABLE "documents" DROP CONSTRAINT "documents_case_id_fkey";

-- DropForeignKey
ALTER TABLE "family_contacts" DROP CONSTRAINT "family_contacts_case_id_fkey";

-- DropForeignKey
ALTER TABLE "follow_ups" DROP CONSTRAINT "follow_ups_case_id_fkey";

-- DropForeignKey
ALTER TABLE "follow_ups" DROP CONSTRAINT "follow_ups_contact_id_fkey";

-- DropForeignKey
ALTER TABLE "memorial_pages" DROP CONSTRAINT "memorial_pages_case_id_fkey";

-- DropForeignKey
ALTER TABLE "obituaries" DROP CONSTRAINT "obituaries_case_id_fkey";

-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_case_id_fkey";

-- DropForeignKey
ALTER TABLE "signatures" DROP CONSTRAINT "signatures_case_id_fkey";

-- DropForeignKey
ALTER TABLE "tasks" DROP CONSTRAINT "tasks_case_id_fkey";

-- DropForeignKey
ALTER TABLE "vendor_assignments" DROP CONSTRAINT "vendor_assignments_case_id_fkey";

-- CreateTable
CREATE TABLE "merchandise_items" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "MerchandiseCategory" NOT NULL,
    "price_retail" DECIMAL(10,2) NOT NULL,
    "price_cost" DECIMAL(10,2),
    "photo_urls" TEXT[],
    "sku" TEXT,
    "in_stock" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "merchandise_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_merchandise" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "case_id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "price_at_time" DECIMAL(10,2) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "case_merchandise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "preneed_arrangements" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "client_first_name" TEXT NOT NULL,
    "client_last_name" TEXT NOT NULL,
    "client_dob" TIMESTAMP(3),
    "client_phone" TEXT,
    "client_email" TEXT,
    "client_address" TEXT,
    "funding_type" TEXT,
    "policy_number" TEXT,
    "insurance_company" TEXT,
    "face_value" DECIMAL(10,2),
    "service_type" "ServiceType" NOT NULL,
    "service_preferences" JSONB NOT NULL DEFAULT '{}',
    "converted_case_id" TEXT,
    "converted_at" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'active',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "preneed_arrangements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cemetery_records" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "case_id" TEXT NOT NULL,
    "cemetery_name" TEXT,
    "cemetery_address" TEXT,
    "cemetery_phone" TEXT,
    "section_lot_grave" TEXT,
    "interment_type" TEXT,
    "opening_closing_ordered" BOOLEAN NOT NULL DEFAULT false,
    "opening_closing_ordered_at" TIMESTAMP(3),
    "interment_scheduled_at" TIMESTAMP(3),
    "interment_completed_at" TIMESTAMP(3),
    "permit_number" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cemetery_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "death_certificates" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "case_id" TEXT NOT NULL,
    "deceased_full_name" TEXT NOT NULL,
    "date_of_death" TIMESTAMP(3) NOT NULL,
    "place_of_death" TEXT,
    "cause_of_death" TEXT,
    "certified_copies_ordered" INTEGER NOT NULL DEFAULT 0,
    "certified_copies_received" INTEGER NOT NULL DEFAULT 0,
    "edrs_filed_at" TIMESTAMP(3),
    "state_filed_at" TIMESTAMP(3),
    "physician_name" TEXT,
    "physician_signed_at" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "death_certificates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "first_calls" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "case_id" TEXT NOT NULL,
    "called_at" TIMESTAMP(3) NOT NULL,
    "called_by" TEXT,
    "caller_relationship" TEXT,
    "removal_address" TEXT,
    "removal_location" TEXT,
    "removal_at" TIMESTAMP(3),
    "removed_by" TEXT,
    "authorized_by" TEXT,
    "authorization_method" TEXT,
    "special_instructions" TEXT,
    "weight_estimate" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "first_calls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cremation_authorizations" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "case_id" TEXT NOT NULL,
    "authorizer_name" TEXT NOT NULL,
    "authorizer_relationship" TEXT NOT NULL,
    "authorizer_phone" TEXT,
    "authorizer_email" TEXT,
    "authorized_at" TIMESTAMP(3),
    "waiting_period_hours" INTEGER NOT NULL DEFAULT 24,
    "cremation_cleared_at" TIMESTAMP(3),
    "cremation_performed_at" TIMESTAMP(3),
    "cremation_location" TEXT,
    "disposition_instructions" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "signature_token" TEXT,
    "signed_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cremation_authorizations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "merchandise_items_tenant_id_category_idx" ON "merchandise_items"("tenant_id", "category");

-- CreateIndex
CREATE INDEX "case_merchandise_tenant_id_case_id_idx" ON "case_merchandise"("tenant_id", "case_id");

-- CreateIndex
CREATE UNIQUE INDEX "preneed_arrangements_converted_case_id_key" ON "preneed_arrangements"("converted_case_id");

-- CreateIndex
CREATE INDEX "preneed_arrangements_tenant_id_status_idx" ON "preneed_arrangements"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "cemetery_records_case_id_key" ON "cemetery_records"("case_id");

-- CreateIndex
CREATE UNIQUE INDEX "death_certificates_case_id_key" ON "death_certificates"("case_id");

-- CreateIndex
CREATE INDEX "death_certificates_tenant_id_idx" ON "death_certificates"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "first_calls_case_id_key" ON "first_calls"("case_id");

-- CreateIndex
CREATE INDEX "first_calls_tenant_id_idx" ON "first_calls"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "cremation_authorizations_case_id_key" ON "cremation_authorizations"("case_id");

-- CreateIndex
CREATE UNIQUE INDEX "cremation_authorizations_signature_token_key" ON "cremation_authorizations"("signature_token");

-- CreateIndex
CREATE INDEX "cremation_authorizations_tenant_id_idx" ON "cremation_authorizations"("tenant_id");

-- AddForeignKey
ALTER TABLE "family_contacts" ADD CONSTRAINT "family_contacts_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "obituaries" ADD CONSTRAINT "obituaries_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "family_contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_assignments" ADD CONSTRAINT "vendor_assignments_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signatures" ADD CONSTRAINT "signatures_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_line_items" ADD CONSTRAINT "case_line_items_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memorial_pages" ADD CONSTRAINT "memorial_pages_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merchandise_items" ADD CONSTRAINT "merchandise_items_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_merchandise" ADD CONSTRAINT "case_merchandise_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_merchandise" ADD CONSTRAINT "case_merchandise_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_merchandise" ADD CONSTRAINT "case_merchandise_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "merchandise_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preneed_arrangements" ADD CONSTRAINT "preneed_arrangements_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preneed_arrangements" ADD CONSTRAINT "preneed_arrangements_converted_case_id_fkey" FOREIGN KEY ("converted_case_id") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cemetery_records" ADD CONSTRAINT "cemetery_records_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cemetery_records" ADD CONSTRAINT "cemetery_records_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "death_certificates" ADD CONSTRAINT "death_certificates_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "death_certificates" ADD CONSTRAINT "death_certificates_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "first_calls" ADD CONSTRAINT "first_calls_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "first_calls" ADD CONSTRAINT "first_calls_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cremation_authorizations" ADD CONSTRAINT "cremation_authorizations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cremation_authorizations" ADD CONSTRAINT "cremation_authorizations_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
