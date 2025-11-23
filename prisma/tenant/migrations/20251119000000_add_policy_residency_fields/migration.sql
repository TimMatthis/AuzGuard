-- Add residency requirement columns to tenant-scoped policies table
ALTER TABLE "policies"
  ADD COLUMN IF NOT EXISTS "residency_requirement_default" TEXT,
  ADD COLUMN IF NOT EXISTS "residency_override" TEXT;





