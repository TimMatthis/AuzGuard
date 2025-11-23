-- Add models field to api_keys table
ALTER TABLE "api_keys"
  ADD COLUMN IF NOT EXISTS "models" JSONB;




