-- Create policies table if it doesn't exist (it was dropped in init migration)
CREATE TABLE IF NOT EXISTS "policies" (
    "policy_id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "jurisdiction" TEXT NOT NULL,
    "evaluation_strategy" JSONB NOT NULL,
    "rules" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "published_by" TEXT,

    CONSTRAINT "policies_pkey" PRIMARY KEY ("policy_id")
);

-- Add residency requirement columns to policies table
ALTER TABLE "policies"
  ADD COLUMN IF NOT EXISTS "residency_requirement_default" TEXT,
  ADD COLUMN IF NOT EXISTS "residency_override" TEXT;

