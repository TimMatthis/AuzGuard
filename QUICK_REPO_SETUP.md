# Quick Repository Setup Guide

This guide helps you quickly set up AuzGuard on a new machine by pulling from GitHub.

## 🚀 Quick Start (5 Minutes)

### 1. Clone the Repository

```bash
git clone https://github.com/TimMatthis/AuzGuard.git
cd AuzGuard
```

### 2. Install Dependencies

```bash
npm install
cd frontend
npm install
cd ..
```

### 3. Set Up Environment

```bash
# Copy the environment template
cp env.example .env

# Edit .env with your settings (see below for key values)
```

**Minimum Required Settings in `.env`:**

```env
# Update with your PostgreSQL password
MASTER_DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/auzguard_master"
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/auzguard_master"

# Generate new secrets (see commands below)
JWT_SECRET="your-generated-secret-here"
HASH_SALT="your-generated-salt-here"

# Basic configuration
PORT=3001
NODE_ENV=development
FRONTEND_URL="http://localhost:3000"
MODEL_GARDEN_STUB_RESPONSES=true
```

**Generate Secure Secrets:**

```bash
# Generate JWT Secret
openssl rand -base64 32

# Generate Hash Salt
openssl rand -base64 32
```

Copy the generated values into your `.env` file.

### 4. Set Up Databases

**Option A: Fresh Start (No Existing Data)**

```bash
# Create master database
psql -U postgres -c "CREATE DATABASE auzguard_master;"

# Generate Prisma clients and push schema
npx prisma generate
npx prisma db push --schema=./prisma/schema-master.prisma

# Build and start
npm run build
npm start
```

Then visit `http://localhost:3000/login` and register your first company.

**Option B: Restore from Backup**

If you have a database backup from another machine:

```powershell
# Windows
.\scripts\import-database.ps1 -BackupDir "path\to\backup_folder"
```

```bash
# Linux/Mac
./scripts/import-database.sh path/to/backup_folder
```

Then:

```bash
npx prisma generate
npm run build
npm start
```

---

## 📦 Export Database Before Switching Machines

Before you leave your current machine, export your databases:

```powershell
# Windows
.\scripts\export-database.ps1
```

```bash
# Linux/Mac
./scripts/export-database.sh
```

This creates a backup in `database-backups/backup_TIMESTAMP/` containing:
- `auzguard_master.sql` - Tenant registry
- `auzguard_tenant_*.sql` - All tenant databases
- `export_metadata.json` - Backup info

**Copy the entire backup folder** to your new machine or cloud storage.

---

## 🔄 Workflow for Team Development

### Developer 1 (Makes Changes)

```bash
# 1. Make code changes
# 2. Export database if data schema changed
.\scripts\export-database.ps1

# 3. Commit code
git add -A
git commit -m "Feature: XYZ"
git push origin feature/branch-name
```

### Developer 2 (Pulls Changes)

```bash
# 1. Pull latest code
git pull origin feature/branch-name

# 2. Install any new dependencies
npm install
cd frontend && npm install && cd ..

# 3. If schema changed, restore database
.\scripts\import-database.ps1 -BackupDir "shared/backup_folder"

# 4. Regenerate Prisma clients
npx prisma generate

# 5. Build and run
npm run build
npm start
```

---

## 🎯 What Gets Committed to Git

✅ **DO commit:**
- All source code (`src/`, `frontend/src/`)
- Configuration templates (`env.example`)
- Database schemas (`prisma/schema*.prisma`)
- Migration files (`prisma/migrations/`)
- Documentation (`*.md`)
- Scripts (`scripts/`)

❌ **DON'T commit:**
- `.env` (contains secrets)
- `node_modules/` (dependencies)
- `dist/` (built files)
- Database dumps (`.sql` files in `database-backups/`)
- `database-backups/` folder

Your `.gitignore` is already configured correctly.

---

## 🗄️ Sharing Databases Between Developers

### Option 1: Shared Network Drive

```bash
# Export to shared location
.\scripts\export-database.ps1 -OutputDir "\\shared\drive\auzguard-backups"

# Other developers import from there
.\scripts\import-database.ps1 -BackupDir "\\shared\drive\auzguard-backups\backup_TIMESTAMP"
```

### Option 2: Cloud Storage (Dropbox, Google Drive, OneDrive)

```bash
# Export locally
.\scripts\export-database.ps1

# Copy to cloud sync folder
cp -r database-backups/backup_TIMESTAMP "C:\Users\YourName\Dropbox\AuzGuard\backups\"

# Other developers download and import
.\scripts\import-database.ps1 -BackupDir "C:\Users\TheirName\Dropbox\AuzGuard\backups\backup_TIMESTAMP"
```

### Option 3: Staging Database Server (Production-Like)

Set up a shared PostgreSQL server:

```env
# In .env
MASTER_DATABASE_URL="postgresql://user:pass@staging-server:5432/auzguard_master"
```

All developers connect to the same database (requires VPN/network access).

---

## 📋 Daily Workflow Checklist

**Starting Work:**
```bash
# 1. Pull latest code
git pull

# 2. Install dependencies (if package.json changed)
npm install

# 3. Regenerate Prisma clients (if schema changed)
npx prisma generate

# 4. Start development servers
npm run dev
```

**Ending Work:**
```bash
# 1. Export database if you made schema changes
.\scripts\export-database.ps1

# 2. Commit your changes
git add -A
git commit -m "Your commit message"
git push
```

---

## 🆘 Common Issues

### "Database does not exist"

```bash
# Create it
psql -U postgres -c "CREATE DATABASE auzguard_master;"

# Push schema
npx prisma db push --schema=./prisma/schema-master.prisma
```

### "Prisma Client not generated"

```bash
npx prisma generate
```

### "Port 3001 already in use"

```bash
# Windows: Find and kill process
netstat -ano | findstr :3001
taskkill /PID <process_id> /F

# Linux/Mac: Find and kill process
lsof -i :3001
kill -9 <PID>
```

### ".env file not found"

```bash
cp env.example .env
# Then edit .env with your settings
```

---

## 📚 Additional Resources

- **Full Setup Guide**: `DATABASE_SETUP_GUIDE.md`
- **Environment Variables**: `env.example`
- **Multi-Tenant Info**: `SETUP_CHECKLIST.md`
- **API Documentation**: `README.md`

