-- CreateEnum
CREATE TYPE "CaseStage" AS ENUM ('first_call', 'arrangement_scheduled', 'arrangement_complete', 'in_preparation', 'services_scheduled', 'services_complete', 'death_cert_filed', 'closed');

-- AlterTable
ALTER TABLE "cases" ADD COLUMN     "stage" "CaseStage" NOT NULL DEFAULT 'first_call';

-- CreateTable
CREATE TABLE "case_notes" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "case_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "case_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "case_notes_tenant_id_case_id_created_at_idx" ON "case_notes"("tenant_id", "case_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "case_notes" ADD CONSTRAINT "case_notes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_notes" ADD CONSTRAINT "case_notes_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
