-- Query to check tenant and admin verification status
-- Run this against the auzguard_master database

-- Show all tenants with their verification status
SELECT 
    slug,
    company_name,
    admin_email,
    admin_email_verified,
    status,
    created_at,
    last_active_at
FROM tenants
ORDER BY created_at DESC;

-- Show only unverified tenants
-- SELECT 
--     slug,
--     company_name,
--     admin_email,
--     admin_email_verified,
--     created_at
-- FROM tenants
-- WHERE admin_email_verified = false
-- ORDER BY created_at DESC;

-- Count verified vs unverified tenants
-- SELECT 
--     admin_email_verified,
--     COUNT(*) as count
-- FROM tenants
-- GROUP BY admin_email_verified;










