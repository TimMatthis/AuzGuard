# AuzGuard Database Setup & Backup Guide

This guide explains how to set up, backup, and restore AuzGuard databases.

## Table of Contents
- [Initial Setup](#initial-setup)
- [Database Architecture](#database-architecture)
- [Backup Databases](#backup-databases)
- [Restore Databases](#restore-databases)
- [Pulling from Repository](#pulling-from-repository)

---

## Initial Setup

### 1. Prerequisites

Ensure you have PostgreSQL installed and running:

```bash
# Check PostgreSQL version
psql --version

# Start PostgreSQL service (if not running)
# Windows: Service runs automatically
# Mac: brew services start postgresql
# Linux: sudo systemctl start postgresql
```

### 2. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and update the following critical values:

```env
# Master database (stores tenant registry)
MASTER_DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/auzguard_master"

# JWT Secret (generate with: openssl rand -base64 32)
JWT_SECRET="your-generated-secret-here"

# Hash Salt (generate with: openssl rand -base64 32)
HASH_SALT="your-generated-salt-here"
```

**⚠️ NEVER commit your `.env` file to git!** It contains sensitive credentials.

### 3. Create Master Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create the master database
CREATE DATABASE auzguard_master;

# Exit
\q
```

### 4. Run Migrations

```bash
# Generate Prisma clients
npx prisma generate

# Push master schema to database
npx prisma db push --schema=./prisma/schema-master.prisma
```

### 5. Start the Application

```bash
# Install dependencies
npm install
cd frontend && npm install && cd ..

# Build and start
npm run build
npm start
```

The application will:
- Backend API: `http://localhost:3001`
- Frontend: `http://localhost:3000`

---

## Database Architecture

AuzGuard uses a **multi-tenant architecture** with isolated databases:

```
PostgreSQL Server
├── auzguard_master              # Tenant registry (required)
│   ├── tenants                  # Company/tenant metadata
│   └── tenant_invitations       # Email verification tokens
│
├── auzguard_tenant_company1     # Isolated database for Company 1
│   ├── users
│   ├── user_groups
│   ├── policies
│   ├── audit_log
│   ├── model_pools
│   ├── tenant_branding
│   └── ... (all tenant-specific data)
│
├── auzguard_tenant_company2     # Isolated database for Company 2
│   └── ... (isolated from Company 1)
│
└── ...
```

**Key Concepts:**
- **Master Database**: Central registry of all tenants
- **Tenant Databases**: One isolated database per company/tenant
- **Automatic Creation**: Tenant databases are created automatically during company registration
- **Data Isolation**: Each company's data is completely isolated

---

## Backup Databases

### Windows (PowerShell)

```powershell
# Export all databases
.\scripts\export-database.ps1

# Export to specific directory
.\scripts\export-database.ps1 -OutputDir "my-backups"

# With custom PostgreSQL credentials
.\scripts\export-database.ps1 -PostgresUser "myuser" -PostgresHost "localhost"
```

### Linux/Mac (Bash)

```bash
# Make script executable (first time only)
chmod +x scripts/export-database.sh

# Export all databases
./scripts/export-database.sh

# Export to specific directory
./scripts/export-database.sh my-backups
```

### What Gets Exported

The export script creates a timestamped directory containing:

```
database-backups/backup_20241110_120000/
├── auzguard_master.sql              # Master database
├── auzguard_tenant_company1.sql     # Tenant database 1
├── auzguard_tenant_company2.sql     # Tenant database 2
└── export_metadata.json             # Export metadata
```

### Scheduling Automatic Backups

**Windows (Task Scheduler):**
```powershell
# Create a daily backup task
$action = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-File C:\www\AuzGuard\scripts\export-database.ps1"
$trigger = New-ScheduledTaskTrigger -Daily -At 2am
Register-ScheduledTask -Action $action -Trigger $trigger -TaskName "AuzGuard DB Backup" -Description "Daily backup of AuzGuard databases"
```

**Linux/Mac (Cron):**
```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * cd /path/to/AuzGuard && ./scripts/export-database.sh
```

---

## Restore Databases

### Windows (PowerShell)

```powershell
# Restore from a backup
.\scripts\import-database.ps1 -BackupDir "database-backups\backup_20241110_120000"

# Drop existing databases and restore (⚠️ DESTRUCTIVE)
.\scripts\import-database.ps1 -BackupDir "database-backups\backup_20241110_120000" -DropExisting
```

### Linux/Mac (Bash)

```bash
# Restore from a backup
./scripts/import-database.sh database-backups/backup_20241110_120000

# Drop existing databases and restore (⚠️ DESTRUCTIVE)
./scripts/import-database.sh database-backups/backup_20241110_120000 --drop-existing
```

### After Restoring

```bash
# Regenerate Prisma clients
npx prisma generate

# Restart the application
npm start
```

---

## Pulling from Repository

When you clone or pull the repository on a new machine:

### Step 1: Clone Repository

```bash
git clone https://github.com/YourOrg/AuzGuard.git
cd AuzGuard
```

### Step 2: Install Dependencies

```bash
npm install
cd frontend && npm install && cd ..
```

### Step 3: Set Up Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your database credentials
# Use your preferred text editor
```

### Step 4: Set Up Databases

**Option A: Fresh Start (Empty Databases)**

```bash
# Create master database
psql -U postgres -c "CREATE DATABASE auzguard_master;"

# Run migrations
npx prisma generate
npx prisma db push --schema=./prisma/schema-master.prisma

# Start application and register your first company
npm start
```

**Option B: Restore from Backup**

If you have a database backup from another machine:

```bash
# 1. Copy your backup directory to this machine
# 2. Restore databases (Windows)
.\scripts\import-database.ps1 -BackupDir "path\to\backup"

# Or restore databases (Linux/Mac)
./scripts/import-database.sh path/to/backup

# 3. Generate Prisma clients
npx prisma generate

# 4. Start application
npm start
```

---

## Best Practices

### Security
- ✅ **DO** keep `.env` in `.gitignore`
- ✅ **DO** use `.env.example` as a template in the repository
- ✅ **DO** generate unique secrets for each environment
- ❌ **DON'T** commit `.env` files
- ❌ **DON'T** share database credentials in chat/email
- ❌ **DON'T** use the same secrets in development and production

### Backups
- ✅ **DO** schedule regular automated backups
- ✅ **DO** test your restore process periodically
- ✅ **DO** store backups in a secure location
- ✅ **DO** keep multiple backup versions
- ❌ **DON'T** commit database dumps to git (they can be large)

### Environment Variables
- ✅ **DO** document all required variables in `.env.example`
- ✅ **DO** use strong random secrets
- ✅ **DO** update `.env.example` when adding new variables
- ❌ **DON'T** use default/example values in production

---

## Troubleshooting

### "Database does not exist" Error

```bash
# Create the missing database
psql -U postgres -c "CREATE DATABASE auzguard_master;"

# Run migrations
npx prisma db push --schema=./prisma/schema-master.prisma
```

### "Connection refused" Error

```bash
# Check if PostgreSQL is running
# Windows: Check Services
# Mac: brew services list
# Linux: sudo systemctl status postgresql

# Start PostgreSQL if needed
# Mac: brew services start postgresql
# Linux: sudo systemctl start postgresql
```

### "Permission denied" Error

Update your DATABASE_URL in `.env` with correct credentials:
```env
MASTER_DATABASE_URL="postgresql://postgres:correct_password@localhost:5432/auzguard_master"
```

### Tenant Database Not Created

If a tenant database wasn't created during registration:

```bash
# Manually create and migrate
psql -U postgres -c "CREATE DATABASE auzguard_tenant_companyslug;"
npx prisma db push --schema=./prisma/tenant/schema.prisma
```

---

## Additional Resources

- **Prisma Documentation**: https://www.prisma.io/docs
- **PostgreSQL Documentation**: https://www.postgresql.org/docs/
- **AuzGuard Setup Checklist**: See `SETUP_CHECKLIST.md`
- **Database Connection Info**: See `DATABASE_CONNECTION_INFO.md`

