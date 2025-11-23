# Fix Database - Add tenant_branding Table

## Problem
Getting 400 Bad Request error when trying to save company name because the `tenant_branding` table doesn't exist yet.

## Solution
Run the SQL script to create the missing table.

## Option 1: Using pgAdmin (Easiest)

1. Open **pgAdmin**
2. Connect to your PostgreSQL server
3. Navigate to your database (usually `auzguard`)
4. Right-click on the database → **Query Tool**
5. Open the file `add_tenant_branding_table.sql` and copy all contents
6. Paste into the Query Tool
7. Click **Execute/Play** button (▶️)
8. You should see success messages

## Option 2: Using psql Command Line

```bash
# Windows PowerShell
psql -U postgres -d auzguard -f add_tenant_branding_table.sql

# Or connect first, then run:
psql -U postgres -d auzguard
\i add_tenant_branding_table.sql
```

## Option 3: Using DBeaver or Other SQL Client

1. Open your SQL client
2. Connect to your `auzguard` database
3. Open `add_tenant_branding_table.sql`
4. Execute the script

## Verify It Worked

After running the script, check in your SQL client:

```sql
-- This should return the table structure
SELECT * FROM tenant_branding;

-- Check the columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'tenant_branding';
```

## Then Try Again

1. Go back to your browser
2. Navigate to **Company Admin** page (`/company-admin`)
3. Click **"Edit Branding"**
4. Enter your company name
5. Click **"Save Changes"**
6. It should now work! ✅

## Alternative: Prisma Migrate (If Above Doesn't Work)

If you prefer to use Prisma migrations:

```bash
cd prisma/tenant
npx prisma db push
```

This will sync your schema with the database without using migrations.

## Need Help?

If you're still getting errors, check:
1. Database connection is working
2. You're connected to the correct database (`auzguard`)
3. Your PostgreSQL user has CREATE TABLE permissions
4. The backend server logs for specific error messages










