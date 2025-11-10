-- Common Database Queries for AuzGuard
-- =========================================

-- MASTER DATABASE (auzguard_master)
-- =========================================

-- 1. List all tenants with basic info
SELECT 
    slug,
    company_name,
    admin_email,
    admin_email_verified,
    status,
    plan,
    created_at
FROM tenants
ORDER BY created_at DESC;

-- 2. Find a specific tenant by slug
-- SELECT * FROM tenants WHERE slug = 'your-slug';

-- 3. Find a tenant by admin email
-- SELECT * FROM tenants WHERE admin_email = 'email@example.com';

-- 4. Count tenants by verification status
SELECT 
    admin_email_verified,
    COUNT(*) as count
FROM tenants
GROUP BY admin_email_verified;

-- 5. Show unverified tenants (for reminder emails)
SELECT 
    slug,
    company_name,
    admin_email,
    created_at,
    EXTRACT(HOUR FROM (NOW() - created_at)) as hours_since_registration
FROM tenants
WHERE admin_email_verified = false
ORDER BY created_at DESC;


-- TENANT DATABASE (auzguard_tenant_*)
-- =========================================
-- Connect to specific tenant first:
-- \c auzguard_tenant_your_slug

-- 1. List all users in tenant
-- SELECT id, email, role, email_verified, is_active, last_login, created_at FROM users;

-- 2. Find admin user
-- SELECT * FROM users WHERE role = 'admin';

-- 3. Check verification token for a user
-- SELECT email, verification_token, verification_token_expires, email_verified 
-- FROM users 
-- WHERE email = 'email@example.com';

-- 4. Count users by role
-- SELECT role, COUNT(*) as count FROM users GROUP BY role;

-- 5. Show recent logins
-- SELECT email, role, last_login FROM users WHERE last_login IS NOT NULL ORDER BY last_login DESC LIMIT 10;


-- ADMIN TASKS
-- =========================================

-- Manually verify a user's email (if needed)
-- UPDATE users SET email_verified = true, verification_token = NULL WHERE email = 'email@example.com';

-- Update master tenant verification status
-- UPDATE tenants SET admin_email_verified = true WHERE slug = 'tenant-slug';

-- Reset verification token expiry (extend by 24 hours)
-- UPDATE users SET verification_token_expires = NOW() + INTERVAL '24 hours' WHERE email = 'email@example.com';

