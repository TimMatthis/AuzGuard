# Update Existing Database Schema

## If You Have an Existing PostgreSQL Database

This guide helps you update an out-of-sync database to match the latest schema.

---

## Step 1: Backup Your Database First! 🚨

**ALWAYS backup before running migrations!**

### Windows:
```powershell
.\scripts\export-database.ps1
```

### Linux/Mac:
```bash
chmod +x scripts/export-database.sh
./scripts/export-database.sh
```

Or manually:
```bash
pg_dump -U postgres -d auzguard_master > backup_master.sql
```

---

## Step 2: Check Current Migration Status

### Check Master Database

```bash
# Connect to master database
psql -U postgres -d auzguard_master

# Check if migrations table exists
\dt _prisma_migrations

# If it exists, check which migrations have run
SELECT migration_name, finished_at 
FROM _prisma_migrations 
ORDER BY finished_at DESC 
LIMIT 10;

# Exit
\q
```

### Expected Latest Migrations

**Master Database should have:**
- `20251110005726_init`
- `20251110083627_add_users_groups_product_access`
- `20251113105128_add_unique_admin_email`
- `20251118221805_19_november`
- `20251119000000_add_policy_residency_fields`
- `20251121091806_add_api_keys_to_main_db`
- `20251121094639_add_branding_and_chat`
- `20251121100039_add_user_verification_fields`

---

## Step 3: Update Master Database

### Option A: Run Migrations (Recommended)

This will apply any missing migrations:

```bash
# From project root
npx prisma migrate deploy

# Regenerate Prisma client
npx prisma generate
```

### Option B: Reset Database (Nuclear Option - DELETES ALL DATA)

⚠️ **WARNING: This will DELETE all data!** Only use if you don't need the existing data.

```bash
npx prisma migrate reset
```

---

## Step 4: Update Tenant Databases

If you have existing tenant databases, update them too:

### Automatic Update (All Tenants)

**Windows:**
```powershell
.\run-tenant-migrations.ps1
```

**Linux/Mac:**
```bash
chmod +x run-tenant-migrations.sh
./run-tenant-migrations.sh
```

### Manual Update (Single Tenant)

If you know the tenant slug:

```bash
# Set environment variable to tenant database
export DATABASE_URL="postgresql://postgres:password@localhost:5432/auzguard_tenant_<slug>"

# Run tenant migrations
cd prisma/tenant
npx prisma migrate deploy
npx prisma generate
cd ../..
```

Example for tenant "acme-corp":
```bash
export DATABASE_URL="postgresql://postgres:password@localhost:5432/auzguard_tenant_acme-corp"
cd prisma/tenant
npx prisma migrate deploy
npx prisma generate
cd ../..
```

---

## Step 5: Verify Updates

### Check Master Database Schema

```bash
psql -U postgres -d auzguard_master -c "\dt"
```

**Expected tables:**
- `_prisma_migrations`
- `api_keys` ✨ (new)
- `audit_log`
- `chat_messages` ✨ (new)
- `chat_sessions` ✨ (new)
- `model_invocations`
- `model_pools`
- `policies`
- `product_access_groups`
- `route_profiles`
- `route_targets`
- `tenant_branding` ✨ (new)
- `user_groups`
- `users`

### Check Tenant Database Schema

```bash
psql -U postgres -d auzguard_tenant_<slug> -c "\dt"
```

Should have the same tables as master database.

---

## Step 6: Resolve Migration Conflicts

### If you get "Migration failed" errors:

#### Error: "Database schema is not empty"

This means you have tables but no migration history. Options:

**Option 1: Mark existing migrations as applied (if database is close to current schema)**

```bash
# This will mark migrations as applied without running them
npx prisma migrate resolve --applied "20251110005726_init"
npx prisma migrate resolve --applied "20251110083627_add_users_groups_product_access"
# ... repeat for each migration

# Then run any remaining migrations
npx prisma migrate deploy
```

**Option 2: Create baseline migration**

```bash
# Generate SQL for current schema
npx prisma migrate diff \
  --from-empty \
  --to-schema-datamodel prisma/schema.prisma \
  --script > baseline.sql

# Review baseline.sql, then apply it manually if needed
psql -U postgres -d auzguard_master -f baseline.sql

# Mark as baseline
npx prisma migrate resolve --applied "20251110005726_init"
```

#### Error: "Column already exists"

The migration is trying to add a column that already exists.

```bash
# Skip this specific migration
npx prisma migrate resolve --applied "migration_name"

# Then continue with remaining migrations
npx prisma migrate deploy
```

#### Error: "Relation does not exist"

A migration expects a table/column that doesn't exist.

```bash
# Check which migration failed
npx prisma migrate status

# Either:
# 1. Run the previous migration first, or
# 2. Manually create the missing table/column, or
# 3. Reset the database (if data loss is acceptable)
```

---

## Step 7: Handle Specific Schema Updates

### Adding Missing Tables Manually

If migrations fail, you can add missing tables manually:

#### Add `api_keys` table (if missing):

```sql
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    encrypted_key TEXT NOT NULL,
    models JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_used_at TIMESTAMP,
    UNIQUE(provider, name)
);
```

#### Add `chat_sessions` table (if missing):

```sql
CREATE TABLE chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    title VARCHAR(500),
    policy_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

#### Add `chat_messages` table (if missing):

```sql
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL,
    role VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
);

CREATE INDEX idx_chat_message_session ON chat_messages(session_id);
```

#### Add `tenant_branding` table (if missing):

```sql
CREATE TABLE tenant_branding (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name VARCHAR(255) NOT NULL,
    logo_url TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Add email verification fields to `users` (if missing):

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token VARCHAR(255) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token_expires TIMESTAMP;
```

#### Add residency fields to `policies` (if missing):

```sql
ALTER TABLE policies ADD COLUMN IF NOT EXISTS residency_requirement_default VARCHAR(100);
ALTER TABLE policies ADD COLUMN IF NOT EXISTS residency_override VARCHAR(100);
```

---

## Common Scenarios

### Scenario 1: Fresh Database (no tables)

```bash
# Just run migrations normally
npx prisma migrate deploy
npx prisma generate
```

### Scenario 2: Old Database (missing recent tables)

```bash
# Backup first!
.\scripts\export-database.ps1

# Run migrations to add missing tables
npx prisma migrate deploy
npx prisma generate

# Update tenant databases
.\run-tenant-migrations.ps1
```

### Scenario 3: Database Has Tables But No Migration History

```bash
# Compare your schema to the Prisma schema
npx prisma db pull

# This creates a schema.prisma from your existing database
# Compare it with prisma/schema.prisma

# If they match closely, mark migrations as applied
npx prisma migrate resolve --applied "20251110005726_init"
# ... repeat for other migrations

# Then run any new migrations
npx prisma migrate deploy
```

### Scenario 4: Completely Out of Sync

```bash
# Option 1: Export data, reset, re-import
pg_dump -U postgres -d auzguard_master --data-only > data_backup.sql
npx prisma migrate reset
psql -U postgres -d auzguard_master -f data_backup.sql

# Option 2: Fresh start (if data loss is acceptable)
dropdb auzguard_master
createdb auzguard_master
npx prisma migrate deploy
```

---

## Verification Commands

After updating, verify everything is correct:

### Check Migration Status

```bash
npx prisma migrate status
```

**Expected output:**
```
Database schema is up to date!
```

### Check Tables Exist

```bash
# Master database
psql -U postgres -d auzguard_master -c "\dt"

# Tenant database
psql -U postgres -d auzguard_tenant_<slug> -c "\dt"
```

### Check Specific Columns Exist

```bash
# Check users table has email_verified
psql -U postgres -d auzguard_master -c "\d users"

# Check policies table has residency fields
psql -U postgres -d auzguard_master -c "\d policies"

# Check api_keys table exists
psql -U postgres -d auzguard_master -c "\d api_keys"
```

### Test Application Connection

```bash
# Start backend
npm run dev

# Should see:
# ✓ Connected to master database
# ✓ Server listening on port 3001
```

---

## Troubleshooting

### "Cannot find module '.prisma/client'"

```bash
npx prisma generate
```

### "Database connection error"

Check `.env` file:
```bash
MASTER_DATABASE_URL="postgresql://postgres:your_password@localhost:5432/auzguard_master"
DATABASE_URL="postgresql://postgres:your_password@localhost:5432/auzguard_master"
```

### "Migration failed: column already exists"

```bash
# Mark that migration as applied
npx prisma migrate resolve --applied "migration_name"

# Continue with remaining migrations
npx prisma migrate deploy
```

### "Table does not exist" when running app

```bash
# Check migration status
npx prisma migrate status

# If migrations pending, run them
npx prisma migrate deploy

# Regenerate client
npx prisma generate
```

---

## Quick Reference Commands

```bash
# Check migration status
npx prisma migrate status

# Run pending migrations
npx prisma migrate deploy

# Regenerate Prisma client
npx prisma generate

# Check database tables
psql -U postgres -d auzguard_master -c "\dt"

# Check migration history
psql -U postgres -d auzguard_master -c "SELECT * FROM _prisma_migrations ORDER BY finished_at DESC"

# Backup database
.\scripts\export-database.ps1

# Update all tenant databases
.\run-tenant-migrations.ps1
```

---

## Need to Start Fresh?

If you want to start completely fresh (⚠️ **DELETES ALL DATA**):

```bash
# Drop existing databases
dropdb auzguard_master
dropdb auzguard_tenant_<slug>  # repeat for each tenant

# Create fresh master database
createdb auzguard_master

# Run all migrations
npx prisma migrate deploy
npx prisma generate

# Tenant databases will be created automatically when companies register
```

---

## Summary Checklist

- [ ] Backup existing database
- [ ] Check current migration status
- [ ] Run `npx prisma migrate deploy` on master database
- [ ] Run `npx prisma generate`
- [ ] Update tenant databases with `.\run-tenant-migrations.ps1`
- [ ] Verify tables exist
- [ ] Test application connection
- [ ] Check for errors in backend logs

---

**If you still have issues, check:**
- `DATABASE_UPGRADE_GUIDE.md` - More detailed migration guidance
- `DATABASE_SCHEMA.md` - Complete schema reference
- Backend logs when running `npm run dev`
- PostgreSQL logs for connection/permission issues

---

**Last Updated:** November 23, 2025

