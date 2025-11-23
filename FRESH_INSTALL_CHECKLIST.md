# Fresh Install Checklist

## ✅ Branch Pushed Successfully!

**Branch Name:** `feature/fresh-install`  
**Repository:** https://github.com/TimMatthis/AuzGuard

## 📦 What's Included

This branch contains everything needed for a complete fresh installation:

### Documentation Files
- ✅ **INSTALLATION.md** - Complete step-by-step installation guide
- ✅ **DATABASE_SCHEMA.md** - Full database schema documentation
- ✅ **QUICK_START.md** - Quick start guide for user management
- ✅ **USER_MANAGEMENT_GUIDE.md** - Detailed user management documentation
- ✅ **DATABASE_UPGRADE_GUIDE.md** - Database migration guide
- ✅ **TENANT_SETUP_GUIDE.md** - Multi-tenant setup instructions
- ✅ **EMAIL_VERIFICATION_GUIDE.md** - Email verification setup
- ✅ **README.md** - Project overview

### Configuration Files
- ✅ **env.example** - Complete environment variable template
- ✅ **package.json** - Backend dependencies
- ✅ **frontend/package.json** - Frontend dependencies
- ✅ **tsconfig.json** - TypeScript configuration

### Database Files
- ✅ **prisma/schema.prisma** - Master database schema
- ✅ **prisma/tenant/schema.prisma** - Tenant database schema
- ✅ **prisma/migrations/** - All master database migrations
- ✅ **prisma/tenant/migrations/** - All tenant database migrations

### Scripts
- ✅ **scripts/export-database.ps1** - Windows database export
- ✅ **scripts/export-database.sh** - Linux/Mac database export
- ✅ **scripts/import-database.ps1** - Windows database import
- ✅ **scripts/import-database.sh** - Linux/Mac database import
- ✅ **scripts/seed-users.ts** - User seeding script
- ✅ **run-tenant-migrations.ps1** - Windows tenant migrations
- ✅ **run-tenant-migrations.sh** - Linux/Mac tenant migrations

### Source Code
- ✅ Complete backend (src/)
- ✅ Complete frontend (frontend/src/)
- ✅ All API routes and services
- ✅ Authentication and authorization
- ✅ Multi-tenant architecture
- ✅ Chat functionality
- ✅ API key management
- ✅ Branding system
- ✅ User management
- ✅ Policy simulator
- ✅ Test files

## 🚀 Quick Start for Fresh Install

### 1. Clone the Repository

```bash
git clone https://github.com/TimMatthis/AuzGuard.git
cd AuzGuard
git checkout feature/fresh-install
```

### 2. Install Dependencies

```bash
# Backend
npm install

# Frontend
cd frontend
npm install
cd ..
```

### 3. Setup PostgreSQL

Create the master database:

```sql
CREATE DATABASE auzguard_master;
```

### 4. Configure Environment

```bash
# Copy environment template
cp env.example .env

# Edit .env with your database credentials and secrets
# Generate secrets using: openssl rand -base64 32
```

**Required Configuration:**
- `MASTER_DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - JWT signing secret
- `HASH_SALT` - Audit log hashing salt
- `API_KEY_ENCRYPTION_KEY` - API key encryption key

### 5. Run Database Migrations

```bash
# Master database
npx prisma migrate deploy
npx prisma generate
```

### 6. Start the Application

```bash
# Backend (terminal 1)
npm run dev

# Frontend (terminal 2)
cd frontend
npm run dev
```

### 7. Register Your Company

1. Open browser: http://localhost:3000/register
2. Fill in company details
3. This will create your tenant database automatically
4. Verify email (check backend console logs if using EMAIL_PROVIDER=console)
5. Login at: http://localhost:3000/login

## 📋 What's New in This Release

### Core Features
- ✅ Multi-tenant architecture with database-per-tenant
- ✅ Company registration and onboarding
- ✅ Email verification system
- ✅ User management with roles and groups
- ✅ Product access control
- ✅ Company branding customization
- ✅ API key management with encryption
- ✅ Chat UI with AI integration
- ✅ Policy simulator
- ✅ Routing configurator
- ✅ Audit logging with cryptographic verification

### Database Features
- ✅ Master database for tenant registry
- ✅ Isolated tenant databases
- ✅ Automatic tenant provisioning
- ✅ Migration scripts for both master and tenant databases
- ✅ Backup and restore scripts

### Security Features
- ✅ JWT-based authentication
- ✅ bcrypt password hashing
- ✅ AES-256-GCM API key encryption
- ✅ Role-based access control (viewer/editor/admin)
- ✅ Email verification
- ✅ Audit trail with WORM design
- ✅ Tenant isolation

## 📚 Key Documentation to Read

**Start Here:**
1. **INSTALLATION.md** - Follow this first for complete setup
2. **DATABASE_SCHEMA.md** - Understand the database structure
3. **QUICK_START.md** - Get started with features

**Advanced Topics:**
- **TENANT_SETUP_GUIDE.md** - Multi-tenant architecture details
- **USER_MANAGEMENT_GUIDE.md** - User and group management
- **EMAIL_VERIFICATION_GUIDE.md** - Email configuration
- **DATABASE_UPGRADE_GUIDE.md** - Migration management

## 🔧 Environment Variables Quick Reference

### Required
```bash
MASTER_DATABASE_URL="postgresql://postgres:password@localhost:5432/auzguard_master"
DATABASE_URL="postgresql://postgres:password@localhost:5432/auzguard_master"
JWT_SECRET="generate-with-openssl-rand-base64-32"
HASH_SALT="generate-with-openssl-rand-base64-32"
API_KEY_ENCRYPTION_KEY="generate-with-openssl-rand-base64-32"
```

### Optional (with defaults)
```bash
PORT=3001
HOST=0.0.0.0
NODE_ENV=development
FRONTEND_URL="http://localhost:3000"
EMAIL_PROVIDER=console
MODEL_GARDEN_STUB_RESPONSES=true
```

## 🗄️ Database Structure

### Master Database (`auzguard_master`)
Contains:
- Tenant registry
- Global configuration
- API keys
- Chat sessions
- User accounts

### Tenant Databases (`auzguard_tenant_<slug>`)
Each tenant gets:
- Isolated user data
- Company-specific policies
- Audit logs
- Branding settings
- Routing configuration

## 🛠️ Troubleshooting

### Database Connection Issues
- Ensure PostgreSQL is running
- Check credentials in `.env`
- Verify database exists: `psql -l`

### Migration Errors
- Check PostgreSQL version (requires v14+)
- Ensure user has CREATE privileges
- Review migration logs

### Port Conflicts
- Backend default: 3001 (change in `.env`)
- Frontend default: 3000 (change in `frontend/vite.config.ts`)

### Email Verification
- For development: Use `EMAIL_PROVIDER=console` and check backend logs
- For production: Configure SendGrid or AWS SES

## 📊 Stats

**Commit:** 14a4ac7  
**Files Changed:** 79 files  
**Insertions:** 6,969 lines  
**Deletions:** 887 lines

## 🎯 Next Steps After Installation

1. ✅ Complete installation following INSTALLATION.md
2. ✅ Register your first company
3. ✅ Configure branding at `/company-admin`
4. ✅ Create user groups
5. ✅ Add team members at `/users`
6. ✅ Set up API keys at `/api-keys`
7. ✅ Create your first policy
8. ✅ Test in the simulator
9. ✅ Explore chat UI

## 🔐 Security Checklist

Before deploying to production:

- [ ] Generate strong JWT_SECRET
- [ ] Generate strong HASH_SALT
- [ ] Generate strong API_KEY_ENCRYPTION_KEY
- [ ] Configure real email provider (SendGrid/SES)
- [ ] Enable HTTPS
- [ ] Set NODE_ENV=production
- [ ] Configure database backups
- [ ] Set up monitoring
- [ ] Review and update CORS settings
- [ ] Enable rate limiting
- [ ] Review audit log retention

## 📞 Support

If you encounter issues:
1. Check INSTALLATION.md troubleshooting section
2. Review backend logs: `npm run dev` output
3. Check browser console (F12)
4. Review PostgreSQL logs
5. Check relevant documentation files

## 🎉 Ready to Go!

Everything you need for a fresh installation is now in the `feature/fresh-install` branch.

**Clone and follow INSTALLATION.md to get started!**

---

**Last Updated:** November 23, 2025  
**Branch:** feature/fresh-install  
**Commit:** 14a4ac7

