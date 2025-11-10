-- Add email verification fields to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_verified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "verification_token" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "verification_token_expires" TIMESTAMP(3);

-- Create unique index on verification_token
CREATE UNIQUE INDEX IF NOT EXISTS "users_verification_token_key" ON "users"("verification_token");

