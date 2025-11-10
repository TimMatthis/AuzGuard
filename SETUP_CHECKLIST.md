# AuzGuard Multi-Tenant Setup Checklist

## ✅ Completed Setup Steps

### 1. Environment Variables
- ✅ Added `MASTER_DATABASE_URL` to `.env`
- ✅ Points to: `postgresql://postgres:PASSWORD@localhost:5432/auzguard_master`

### 2. Database Setup
- ✅ Created master database: `auzguard_master`
- ✅ Ran migrations on master database
- ✅ Generated Prisma clients for master and tenant schemas

### 3. Server Status
- ✅ Backend server running on port 3001
- ✅ Frontend server running on port 3000
- ✅ Multi-tenant architecture fully operational

## 🎯 Ready to Use!

### Access the Application
- **URL**: http://localhost:3000/login
- **Tabs**: Login / Register / Demo

### First-Time Setup Flow

**Step 1: Register Your First Company**
1. Go to http://localhost:3000/login
2. Click "Register" tab
3. Fill in:
   - Company ID: `my-company` (lowercase, hyphens only)
   - Company Name: `My Company Inc`
   - Admin Email: `admin@mycompany.com`
   - Admin Name: `Admin User` (optional)
   - Password: `password123` (min 8 characters)
4. Click "Create Company & Admin Account"

**What Happens:**
- Creates `auzguard_tenant_my_company` database
- Runs all migrations automatically
- Creates your admin user
- Logs you in with JWT token containing `tenant_slug`
- Redirects to dashboard

**Step 2: Add Team Members**
- Dashboard → User Management → Add User
- Create users with roles:
  - `admin` - Full access
  - `developer` - Test and develop
  - `compliance` - Manage policies
  - `viewer` - Read-only

**Step 3: Team Members Login**
- They use "Login" tab
- Email + Password
- System routes to correct company database automatically

## 🗄️ Database Architecture

```
PostgreSQL Server
├── auzguard_master (Tenant Registry)
│   ├── tenants (company metadata)
│   └── tenant_invitations
│
├── auzguard_tenant_my_company (Isolated Company 1)
│   ├── users
│   ├── user_groups
│   ├── policies
│   ├── audit_log
│   └── ... (all AuzGuard tables)
│
└── auzguard_tenant_another_company (Isolated Company 2)
    ├── users
    ├── user_groups
    └── ... (complete isolation)
```

## 🔐 Security Features

- ✅ **Database-per-tenant** - Complete data isolation
- ✅ **JWT tokens** include `tenant_slug` - Routes to correct DB
- ✅ **No cross-tenant access** - Impossible by design
- ✅ **Email reuse** - Same email can exist in different companies
- ✅ **Independent scaling** - Each tenant scales separately

## 📝 API Endpoints

### Company Registration
```bash
POST /api/company/register
{
  "slug": "company-id",
  "company_name": "Company Name",
  "admin_email": "admin@company.com",
  "admin_name": "Admin User",
  "admin_password": "secure123"
}
```

### Tenant Login
```bash
POST /api/tenant/login
{
  "email": "user@company.com",
  "password": "password123",
  "tenant_slug": "company-id"  # Optional if email is unique
}
```

### User Management (Tenant-Aware)
All user endpoints automatically route to correct tenant database:
- `GET /api/users` - List users in your company
- `POST /api/users` - Create user (admin only)
- `GET /api/users/:id` - Get user details
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user (admin only)

## 🎉 Features

1. **Automatic Provisioning** - New company = new database (automatic)
2. **Zero Setup** - Migrations run automatically
3. **Complete Isolation** - Each company = separate database
4. **Scalable** - Add unlimited companies
5. **Secure** - Database-level separation

## 🔧 Environment Variables Required

```bash
# Main Database (not used in multi-tenant mode, but keep for compatibility)
DATABASE_URL="postgresql://postgres:PASSWORD@localhost:5432/auzguard"

# Master Tenant Registry Database
MASTER_DATABASE_URL="postgresql://postgres:PASSWORD@localhost:5432/auzguard_master?schema=public"

# JWT Configuration
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_ISSUER="auzguard"
JWT_AUDIENCE="auzguard-api"
```

## 🚀 Testing Multi-Tenancy

### Test Scenario 1: Two Companies
1. Register Company A: `acme-corp`
2. Login as admin, create user: `bob@acme.com`
3. Logout
4. Register Company B: `wayne-industries`
5. Login as admin, create user: `bob@wayne.com`

**Result**: Both `bob` users exist independently in separate databases!

### Test Scenario 2: Data Isolation
1. Login to Company A, create policies/users
2. Logout, login to Company B
3. You won't see Company A's data (impossible to access)

## 📚 Documentation

- `MULTI_TENANT_SUMMARY.md` - Complete architecture overview
- `TENANT_SETUP_GUIDE.md` - Detailed setup instructions
- `prisma/schema-master.prisma` - Master database schema
- `prisma/schema-tenant.prisma` - Tenant database schema

## ✨ Ready to Go!

Your multi-tenant AuzGuard is fully operational! Visit http://localhost:3000/login to get started.

