-- Enforce unique admin emails across tenants at the DB level
-- Note: This will fail if duplicate admin_email rows exist.
-- Clean duplicates before applying or temporarily remove them.

-- Create a unique index on admin_email
CREATE UNIQUE INDEX "tenants_admin_email_key" ON "tenants"("admin_email");

