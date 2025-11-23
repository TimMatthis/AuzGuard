# AuzGuard - Fresh Installation Guide

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** v18 or higher
- **PostgreSQL** v14 or higher
- **npm** or **yarn** package manager
- **Git** for cloning the repository

## Step 1: Clone the Repository

```bash
git clone <repository-url>
cd AuzGuard
git checkout feature/fresh-install
```

## Step 2: Install Dependencies

### Backend Dependencies
```bash
npm install
```

### Frontend Dependencies
```bash
cd frontend
npm install
cd ..
```

## Step 3: Database Setup

### Create PostgreSQL Databases

Connect to PostgreSQL and create the master database:

```sql
CREATE DATABASE auzguard_master;
```

**Note:** Tenant databases will be created automatically when you register your first company.

### Configure Database Connection

1. Copy the environment template:
   ```bash
   cp env.example .env
   ```

2. Edit `.env` and update the database connection strings:
   ```bash
   MASTER_DATABASE_URL="postgresql://postgres:your_password@localhost:5432/auzguard_master"
   DATABASE_URL="postgresql://postgres:your_password@localhost:5432/auzguard_master"
   ```

3. Generate secure secrets:
   ```bash
   # JWT Secret
   openssl rand -base64 32
   
   # Hash Salt
   openssl rand -base64 32
   
   # API Key Encryption Key
   openssl rand -base64 32
   ```

4. Update these values in `.env`:
   - `JWT_SECRET`
   - `HASH_SALT`
   - `API_KEY_ENCRYPTION_KEY`

## Step 4: Run Database Migrations

### Master Database Migration

```bash
npx prisma migrate deploy
npx prisma generate
```

### Verify Migration Success

Check that the master database has the required tables:

```bash
psql -U postgres -d auzguard_master -c "\dt"
```

You should see tables like: `tenants`, `users`, `api_keys`, `branding`, etc.

## Step 5: Start the Application

### Start Backend Server

```bash
npm run dev
```

The backend will start on `http://localhost:3001`

### Start Frontend (New Terminal)

```bash
cd frontend
npm run dev
```

The frontend will start on `http://localhost:3000`

## Step 6: Register Your First Company

1. Open your browser and navigate to: `http://localhost:3000/register`

2. Fill in the registration form:
   - **Company Name**: Your organization name
   - **Email**: Admin email address
   - **Password**: Secure password (min 8 characters)
   - **Slug**: URL-friendly identifier (e.g., "acme-corp")

3. Click "Register Company"

This will:
- Create a tenant record in the master database
- Create a new tenant-specific database (`auzguard_tenant_<slug>`)
- Run migrations on the tenant database
- Create an admin user
- Send a verification email (if email is configured)

## Step 7: Verify Email (Optional)

If you've configured email in `.env`:

1. Check your email for the verification link
2. Click the link to verify your email
3. You'll be redirected to the login page

If using `EMAIL_PROVIDER=console` (development):
- Check the backend console logs for the verification link
- Copy and paste the link into your browser

## Step 8: Login and Explore

1. Navigate to: `http://localhost:3000/login`
2. Enter your email and password
3. You'll be redirected to the dashboard

### Available Features

- **Dashboard** (`/`) - Overview and quick stats
- **Policies** (`/policies`) - Create and manage access policies
- **Rules** (`/rules`) - Define authorization rules
- **Simulator** (`/simulator`) - Test policies and rules
- **Chat UI** (`/chat-ui`) - AI-powered chat interface
- **Users** (`/users`) - User management (admin only)
- **Company Admin** (`/company-admin`) - Branding and settings (admin only)
- **API Keys** (`/api-keys`) - Manage API keys for integrations

## Step 9: Configure Branding (Optional)

1. Navigate to: `http://localhost:3000/company-admin`
2. Click "Edit Branding"
3. Enter:
   - **Company Name**: Your company name
   - **Logo URL**: Publicly accessible logo URL
4. Preview your changes
5. Click "Save Changes"

## Step 10: Create Additional Users (Optional)

1. Navigate to: `http://localhost:3000/users`
2. Click "Create New User"
3. Enter user details:
   - Email
   - Password
   - Role (viewer/editor/admin)
   - Group (optional)
4. Click "Create User"

## Database Schema

The application uses two types of databases:

### Master Database (`auzguard_master`)
Stores multi-tenant configuration:
- `tenants` - Registered companies
- `branding` - Company branding settings
- `api_keys` - Global API keys
- `chat_sessions` - Chat history
- `chat_messages` - Chat messages

### Tenant Databases (`auzguard_tenant_<slug>`)
Each tenant has their own database containing:
- `users` - Tenant users
- `groups` - User groups
- `policies` - Access control policies
- `rules` - Authorization rules
- `routes` - Routing configuration
- `audit_logs` - Audit trail
- `evaluations` - Policy evaluations

## Environment Variables Reference

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `MASTER_DATABASE_URL` | Master database connection | `postgresql://...` |
| `DATABASE_URL` | Legacy database URL | `postgresql://...` |
| `JWT_SECRET` | JWT signing secret | Generated via openssl |
| `HASH_SALT` | Audit log hashing salt | Generated via openssl |
| `API_KEY_ENCRYPTION_KEY` | API key encryption | Generated via openssl |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Backend server port | `3001` |
| `HOST` | Backend server host | `0.0.0.0` |
| `NODE_ENV` | Environment mode | `development` |
| `FRONTEND_URL` | Frontend URL | `http://localhost:3000` |
| `EMAIL_PROVIDER` | Email provider | `console` |
| `MODEL_GARDEN_STUB_RESPONSES` | Use AI stubs | `true` |

See `env.example` for complete list.

## Troubleshooting

### Database Connection Issues

**Error: `ECONNREFUSED`**
- Ensure PostgreSQL is running
- Check database credentials in `.env`
- Verify database exists: `psql -l`

### Migration Errors

**Error: `Migration failed`**
- Check PostgreSQL version (requires v14+)
- Ensure database user has CREATE privileges
- Try: `npx prisma migrate reset` (WARNING: deletes data)

### Port Already in Use

**Error: `EADDRINUSE`**
- Backend port 3001 in use: Change `PORT` in `.env`
- Frontend port 3000 in use: Change in `frontend/vite.config.ts`

### Frontend Not Loading

1. Check backend is running on port 3001
2. Check browser console for errors
3. Verify `FRONTEND_URL` in `.env`
4. Clear browser cache and reload

### Email Verification Not Working

**Using `EMAIL_PROVIDER=console`:**
- Check backend console logs for verification link
- Copy link and open in browser

**Using SendGrid/SES:**
- Verify API keys in `.env`
- Check email provider logs
- Ensure `EMAIL_FROM` is verified sender

### "Cannot find tenant database"

This means the tenant database wasn't created during registration:
1. Check backend logs for errors
2. Manually create database: `CREATE DATABASE auzguard_tenant_<slug>;`
3. Run migrations: See tenant migration guide

## Production Deployment

For production deployment:

1. **Set Environment to Production**
   ```bash
   NODE_ENV=production
   ```

2. **Use Strong Secrets**
   - Generate new JWT_SECRET, HASH_SALT, API_KEY_ENCRYPTION_KEY
   - Never use default/example values

3. **Configure Email Provider**
   - Use SendGrid or AWS SES
   - Verify sender email domain

4. **Enable HTTPS**
   - Use SSL certificates
   - Update FRONTEND_URL to https://

5. **Database Security**
   - Use connection pooling
   - Enable SSL for database connections
   - Regular backups

6. **Build Frontend**
   ```bash
   cd frontend
   npm run build
   ```

7. **Use Process Manager**
   ```bash
   npm install -g pm2
   pm2 start npm --name "auzguard-backend" -- run start
   ```

## Backup and Restore

### Export Databases

**Windows:**
```powershell
.\scripts\export-database.ps1
```

**Linux/Mac:**
```bash
chmod +x scripts/export-database.sh
./scripts/export-database.sh
```

### Import Databases

**Windows:**
```powershell
.\scripts\import-database.ps1 -BackupDir "database-backups\backup_YYYYMMDD_HHMMSS"
```

**Linux/Mac:**
```bash
./scripts/import-database.sh database-backups/backup_YYYYMMDD_HHMMSS
```

## Next Steps

After installation:

1. ✅ Complete company registration
2. ✅ Configure branding
3. ✅ Create user groups
4. ✅ Add team members
5. ✅ Create your first policy
6. ✅ Test in the simulator
7. ✅ Generate API keys for integration

## Documentation

- **QUICK_START.md** - Quick start guide
- **USER_MANAGEMENT_GUIDE.md** - User management features
- **DATABASE_UPGRADE_GUIDE.md** - Database migration guide
- **TENANT_SETUP_GUIDE.md** - Multi-tenant architecture
- **README.md** - Project overview

## Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review backend logs: `npm run dev` output
3. Check browser console: F12 Developer Tools
4. Review PostgreSQL logs
5. Check existing documentation files

## Security Best Practices

1. **Never commit `.env` file** - Already in `.gitignore`
2. **Rotate secrets regularly** - Especially in production
3. **Use strong passwords** - Minimum 12 characters
4. **Enable email verification** - In production
5. **Regular backups** - Automated daily backups
6. **Update dependencies** - Run `npm audit` regularly
7. **Monitor logs** - Set up log aggregation

---

**Installation Complete!** 🎉

Your AuzGuard instance is now ready to use. Navigate to `http://localhost:3000` to get started.

