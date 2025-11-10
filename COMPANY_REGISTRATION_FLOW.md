# Company Registration Flow - Complete Walkthrough

## Overview
This document details exactly what happens when a new company is successfully created in AuzGuard's multi-tenant system.

## 🎯 Registration Request

### Frontend Form Submission
```javascript
POST /api/company/register
{
  "slug": "acme-corp",
  "company_name": "Acme Corporation",
  "admin_email": "admin@acme.com",
  "admin_name": "John Doe",
  "admin_password": "SecurePass123"
}
```

## 📋 Step-by-Step Process

### Step 1: Input Validation
**Location**: `src/routes/tenants.ts`

The system validates:
- ✅ All required fields present (slug, company_name, admin_email, admin_password)
- ✅ Email format valid
- ✅ Password minimum 8 characters
- ✅ Slug format (lowercase, alphanumeric, hyphens only)

```typescript
if (!slug || !company_name || !admin_email || !admin_password) {
  return 400 "Missing required fields"
}
```

### Step 2: Check Duplicate Company
**Location**: `src/services/tenantProvisioning.ts`

```typescript
const existing = await masterPrisma.tenant.findUnique({ 
  where: { slug: 'acme-corp' } 
});

if (existing) {
  throw new Error('A company with this identifier already exists');
}
```

### Step 3: Create PostgreSQL Database
**Location**: `src/services/tenantProvisioning.ts`

```bash
# Database name generated from slug
Database: auzguard_tenant_acme_corp

# Command executed:
psql -h localhost -p 5432 -U postgres -d postgres \
  -c "CREATE DATABASE auzguard_tenant_acme_corp;"

# Environment: PGPASSWORD=<decoded_password>
```

**Result**: New isolated PostgreSQL database created

### Step 4: Build Connection URL
**Location**: `src/services/tenantProvisioning.ts`

```typescript
const encodedPassword = encodeURIComponent(this.dbPassword);
const tenantDbUrl = `postgresql://postgres:${encodedPassword}@localhost:5432/auzguard_tenant_acme_corp?schema=public`;
```

**Why encode?** Special characters like `#` must be URL-encoded for Prisma

### Step 5: Push Database Schema
**Location**: `src/services/tenantProvisioning.ts`

```bash
npx prisma db push \
  --schema=./prisma/tenant/schema.prisma \
  --skip-generate \
  --accept-data-loss

# With environment:
DATABASE_URL="postgresql://postgres:...@localhost:5432/auzguard_tenant_acme_corp"
```

**Creates Tables**:
- ✅ users
- ✅ user_groups
- ✅ product_access_groups
- ✅ route_profiles
- ✅ policies
- ✅ audit_log
- ✅ model_pools
- ✅ route_targets
- ✅ model_invocations

**With**:
- All indexes
- Foreign key constraints
- Unique constraints

### Step 6: Register in Master Database
**Location**: `src/services/tenantProvisioning.ts`

```typescript
const tenant = await masterPrisma.tenant.create({
  data: {
    slug: 'acme-corp',
    company_name: 'Acme Corporation',
    database_name: 'auzguard_tenant_acme_corp',
    database_url: tenantDbUrl,
    admin_email: 'admin@acme.com',
    admin_name: 'John Doe',
    plan: 'starter',
    status: 'active',
    last_active_at: new Date()
  }
});
```

**Master Database** (`auzguard_master`):
```
tenants table:
+------+------------+-----------------+------------------------+--------+--------+
| slug | company_na | database_name   | database_url           | status | plan   |
+------+------------+-----------------+------------------------+--------+--------+
| acme | Acme Corp  | auzguard_tenant | postgresql://postgres  | active | starter|
+------+------------+-----------------+------------------------+--------+--------+
```

### Step 7: Create Initial Admin User
**Location**: `src/services/tenantProvisioning.ts`

```typescript
// Connect to NEW tenant database
const tenantPrisma = new PrismaClient({ 
  datasources: { 
    db: { url: tenantDbUrl } 
  } 
});

// Hash password
const password_hash = await bcrypt.hash('SecurePass123', 12);

// Create admin user IN TENANT DATABASE
const adminUser = await tenantPrisma.user.create({
  data: {
    email: 'admin@acme.com',
    password_hash: password_hash,
    role: 'admin',
    name: 'John Doe',
    is_active: true
  }
});
```

**Result**: Admin user created in isolated tenant database

### Step 8: Audit Log Entry
**Location**: `src/services/tenantProvisioning.ts`

```typescript
await masterPrisma.auditLog.create({
  data: {
    tenant_id: tenant.id,
    action: 'TENANT_CREATED',
    actor_email: 'admin@acme.com',
    metadata: {
      company_name: 'Acme Corporation',
      database_name: 'auzguard_tenant_acme_corp'
    }
  }
});
```

**Purpose**: Track all tenant creation events in master database

### Step 9: Generate JWT Token
**Location**: `src/routes/tenants.ts`

```typescript
const token = authService.generateToken({
  id: adminUser.id,
  email: 'admin@acme.com',
  role: 'admin',
  tenant_slug: 'acme-corp',  // ← Routes to correct database
  created_at: adminUser.created_at
});
```

**JWT Payload**:
```json
{
  "sub": "user-uuid",
  "email": "admin@acme.com",
  "role": "admin",
  "tenant_slug": "acme-corp",
  "iat": 1699999999,
  "exp": 1700086399,
  "iss": "auzguard",
  "aud": "auzguard-api"
}
```

### Step 10: Send Welcome Email
**Location**: `src/routes/tenants.ts` + `src/services/email.ts`

```typescript
emailService.sendCompanyWelcomeEmail({
  companyName: 'Acme Corporation',
  adminName: 'John Doe',
  adminEmail: 'admin@acme.com',
  companySlug: 'acme-corp',
  loginUrl: 'http://localhost:3000/login'
});
```

**Email Contains**:
- 🎉 Welcome message
- 📋 Company details (ID, name)
- 🔗 Direct login link
- 📝 Next steps guide
- 🎨 Professional HTML design

**Current Mode**: Console (logs to terminal)
**Future**: SendGrid, AWS SES, etc.

**Email is non-blocking**: If it fails, registration still succeeds

### Step 11: Return Success Response
**Location**: `src/routes/tenants.ts`

```json
{
  "success": true,
  "tenant": {
    "id": "tenant-uuid",
    "slug": "acme-corp",
    "company_name": "Acme Corporation"
  },
  "user": {
    "id": "user-uuid",
    "email": "admin@acme.com",
    "role": "admin",
    "created_at": "2025-11-10T00:00:00.000Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Step 12: Frontend Actions
**Location**: `frontend/src/pages/Login.tsx`

```typescript
// Store JWT token
localStorage.setItem('auzguard_token', response.token);

// Set token in API client
apiClient.setToken(response.token);

// Redirect to dashboard
navigate('/dashboard');
```

## ✨ Final State

### Master Database (`auzguard_master`)
```
tenants:
  - id: uuid
  - slug: acme-corp
  - company_name: Acme Corporation
  - database_url: postgresql://...
  - status: active

audit_log:
  - tenant_id: uuid
  - action: TENANT_CREATED
  - actor_email: admin@acme.com
```

### Tenant Database (`auzguard_tenant_acme_corp`)
```
users:
  - id: uuid
  - email: admin@acme.com
  - password_hash: $2b$12$...
  - role: admin
  - name: John Doe
  - is_active: true

+ Empty tables ready for use:
  - user_groups
  - policies
  - audit_log
  - model_pools
  - etc.
```

### User's Browser
```
✅ JWT token stored in localStorage
✅ Logged in as admin
✅ Redirected to dashboard
✅ Can now:
   - Create more users
   - Configure policies
   - Set up model pools
   - View audit logs
```

### Terminal (Console Email)
```
========================================
📧 EMAIL NOTIFICATION (Console Mode)
========================================
From: AuzGuard <noreply@auzguard.com>
To: admin@acme.com
Subject: Welcome to AuzGuard - Acme Corporation
----------------------------------------
Hi John Doe! 👋

Congratulations! Your company Acme Corporation 
has been successfully set up on AuzGuard.

COMPANY DETAILS:
- Company ID: acme-corp
- Admin Email: admin@acme.com
- Login URL: http://localhost:3000/login
...
========================================
```

## 🔄 Error Handling

### If ANY Step Fails:

**Automatic Rollback**:
```typescript
try {
  // Steps 3-8
} catch (error) {
  // Drop the database if it was created
  await this.dropDatabase('auzguard_tenant_acme_corp');
  throw error;
}
```

**User Sees**:
```json
{
  "error": {
    "code": "REGISTRATION_ERROR",
    "message": "Failed to create database: ..."
  }
}
```

## 📊 Complete Data Flow

```
[Browser] → POST /api/company/register
    ↓
[Validation] → Check inputs
    ↓
[Master DB] → Check if slug exists
    ↓
[PostgreSQL] → CREATE DATABASE auzguard_tenant_acme_corp
    ↓
[Prisma] → db push (create all tables)
    ↓
[Master DB] → INSERT INTO tenants (...)
    ↓
[Tenant DB] → INSERT INTO users (admin)
    ↓
[Master DB] → INSERT INTO audit_log (TENANT_CREATED)
    ↓
[Auth Service] → Generate JWT with tenant_slug
    ↓
[Email Service] → Send welcome email (non-blocking)
    ↓
[Response] → Return { success, tenant, user, token }
    ↓
[Browser] → Store token, redirect to dashboard
```

## 🎯 Key Benefits

1. **Complete Isolation**: Each company has its own database
2. **Automatic Setup**: Everything configured in one request
3. **Secure**: Passwords hashed, JWT tokens, isolated data
4. **Auditable**: All actions logged in master database
5. **User-Friendly**: Welcome email with all details
6. **Rollback Safe**: Automatic cleanup on errors
7. **Scalable**: Add unlimited companies

## 🧪 Testing

Try creating a company and watch the terminal for:
1. Database creation logs
2. Schema push output
3. Welcome email (console mode)
4. Success response

Then check:
- Master database for tenant record
- New tenant database for admin user
- Browser localStorage for JWT token
- Dashboard redirect

## 🔐 Security Features

- ✅ Password hashing (bcrypt, 12 rounds)
- ✅ JWT tokens with tenant_slug
- ✅ Database-level isolation
- ✅ Input validation
- ✅ SQL injection prevention (Prisma ORM)
- ✅ Audit logging
- ✅ Secure password requirements

---

**Ready to test?** Create a new company and watch the magic happen! 🚀

