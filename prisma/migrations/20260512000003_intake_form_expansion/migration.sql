-- Expand Case with veteran status, place/cause of death, and financial acknowledgment
ALTER TABLE "cases"
  ADD COLUMN IF NOT EXISTS "veteran_status"     BOOLEAN   NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "place_of_death"     TEXT,
  ADD COLUMN IF NOT EXISTS "cause_of_death"     TEXT,
  ADD COLUMN IF NOT EXISTS "financial_ack_at"   TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "how_heard"          TEXT;

-- Expand FamilyContact with address and financial responsibility flag
ALTER TABLE "family_contacts"
  ADD COLUMN IF NOT EXISTS "address_line1"             TEXT,
  ADD COLUMN IF NOT EXISTS "city"                      TEXT,
  ADD COLUMN IF NOT EXISTS "state"                     TEXT,
  ADD COLUMN IF NOT EXISTS "zip"                       TEXT,
  ADD COLUMN IF NOT EXISTS "is_financially_responsible" BOOLEAN NOT NULL DEFAULT FALSE;
