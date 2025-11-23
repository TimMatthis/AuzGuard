ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "name" TEXT,
  ADD COLUMN IF NOT EXISTS "email_verified" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "verification_token" TEXT,
  ADD COLUMN IF NOT EXISTS "verification_token_expires" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "users_verification_token_key" ON "users"("verification_token");


