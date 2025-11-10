# Database Connection Information

## Quick Access

### Option 1: Use the Helper Script (Easiest)
```powershell
.\db-helper.ps1
```

### Option 2: Direct psql Commands

#### Connect to Master Database
```powershell
$password = 'SuperLong#UniquePassword_ChangeMe'
$env:PGPASSWORD = $password
psql -h localhost -U postgres -d auzguard_master
```

#### Connect to Tenant Database
```powershell
$password = 'SuperLong#UniquePassword_ChangeMe'
$env:PGPASSWORD = $password
psql -h localhost -U postgres -d auzguard_tenant_YOUR_SLUG
```

## Connection Strings

### Master Database (Tenant Registry)
```
postgresql://postgres:SuperLong#UniquePassword_ChangeMe@localhost:5432/auzguard_master?schema=public
```

### Example Tenant Database
```
postgresql://postgres:SuperLong#UniquePassword_ChangeMe@localhost:5432/auzguard_tenant_company_2?schema=public
```

## Database Structure

```
PostgreSQL Server (localhost:5432)
├── postgres (system database)
├── auzguard (legacy/compatibility)
├── auzguard_master (tenant registry) ⭐
│   ├── tenants (list of all companies)
│   ├── tenant_invitations
│   └── master_audit_logs
└── auzguard_tenant_* (one per company) ⭐
    ├── users
    ├── user_groups
    ├── policies
    ├── model_pools
    ├── route_targets
    └── audit_log
```

## Common Tasks

### 1. List All Tenants
```sql
-- Connect to auzguard_master first
SELECT slug, company_name, admin_email, admin_email_verified 
FROM tenants 
ORDER BY created_at DESC;
```

### 2. Find Which Database a User Is In
```sql
-- In auzguard_master
SELECT slug, database_name, admin_email 
FROM tenants 
WHERE admin_email = 'user@example.com';
```

### 3. Check User Verification Status
```sql
-- Connect to the tenant database first
-- Example: auzguard_tenant_company_2
SELECT email, role, email_verified, verification_token IS NOT NULL as has_token
FROM users
WHERE email = 'user@example.com';
```

### 4. Manually Verify a User (Emergency)
```sql
-- In tenant database
UPDATE users 
SET email_verified = true, 
    verification_token = NULL, 
    verification_token_expires = NULL 
WHERE email = 'user@example.com';

-- Also update master tenant record
-- In auzguard_master
UPDATE tenants 
SET admin_email_verified = true 
WHERE admin_email = 'user@example.com';
```

## GUI Tools (Recommended)

### pgAdmin
- **Download**: https://www.pgadmin.org/download/
- **Host**: localhost
- **Port**: 5432
- **Username**: postgres
- **Password**: SuperLong#UniquePassword_ChangeMe

### DBeaver (Free, Cross-platform)
- **Download**: https://dbeaver.io/download/
- Same credentials as above

### VS Code Extension
- Install "PostgreSQL" extension by Chris Kolkman
- Add connection with credentials above

## Useful Files

- `db-helper.ps1` - Interactive database helper script
- `query-tenant-status.sql` - Check verification status
- `common-queries.sql` - Common SQL queries reference

## Security Note

⚠️ **Important**: The password `SuperLong#UniquePassword_ChangeMe` is visible in `.env` file. For production:
1. Use strong, unique passwords
2. Store in environment variables
3. Never commit `.env` to git
4. Use SSL/TLS for remote connections

