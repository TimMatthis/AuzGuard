-- Run this SQL script on your tenant database (auzguard)
-- This creates the tenant_branding table needed for the Company Admin feature

CREATE TABLE IF NOT EXISTS "tenant_branding" (
    "id" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "logo_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "tenant_branding_pkey" PRIMARY KEY ("id")
);

-- Optional: Add email verification fields to users table if they don't exist
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_verified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "verification_token" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "verification_token_expires" TIMESTAMP(3);

-- Create unique index on verification_token
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'users_verification_token_key'
    ) THEN
        CREATE UNIQUE INDEX "users_verification_token_key" ON "users"("verification_token");
    END IF;
END $$;

-- Verify tables exist
SELECT 'tenant_branding table created successfully!' as message 
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tenant_branding');

SELECT 'users table updated successfully!' as message 
WHERE EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'email_verified');










