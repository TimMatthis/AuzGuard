# Multi-Tenant Setup Guide

## Overview

AuzGuard now supports **full instance isolation** with a tenant-per-database architecture:
- Each company gets its own isolated database
- Master database manages tenant registry
- Complete data isolation between companies

## Architecture

```
┌─────────────────────────────────────────┐
│         Master Database                 │
│  (Tenant Registry & Metadata)           │
│  - tenants                              │
│  - tenant_invitations                   │
│  - master_audit_logs                    │
└─────────────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
┌───────▼────────┐    ┌────────▼────────┐
│  Tenant DB 1   │    │  Tenant DB 2    │
│  (Company A)   │    │  (Company B)    │
│  - users       │    │  - users        │
│  - policies    │    │  - policies     │
│  - audit_log   │    │  - audit_log    │
│  - ...         │    │  - ...          │
└────────────────┘    └─────────────────┘
```

## Setup Instructions

### 1. Environment Configuration

Add to your `.env` file:

```bash
# Master Database (stores tenant registry)
MASTER_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/auzguard_master?schema=public"

# Keep existing DATABASE_URL for backward compatibility
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/auzguard?schema=public"

# JWT Configuration (existing)
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_ISSUER="auzguard"
JWT_AUDIENCE="auzguard-api"

# Server Configuration
PORT=3001
HOST="0.0.0.0"
NODE_ENV="development"
```

### 2. Initialize Master Database

```bash
# Create the master database
createdb auzguard_master

# Generate Prisma Client for master schema
npx prisma generate --schema=./prisma/schema-master.prisma

# Run master database migrations
npx prisma migrate dev --schema=./prisma/schema-master.prisma --name init
```

### 3. Install Dependencies

Ensure you have the required dependencies:

```bash
npm install @prisma/client bcryptjs
npm install -D @types/bcryptjs prisma
```

### 4. Build and Start

```bash
# Build the application
npm run build

# Start the server
npm run dev
```

## API Endpoints

### Company Registration

**POST** `/api/company/register`

Register a new company and create the first admin user.

Request:
```json
{
  "slug": "acme-corp",
  "company_name": "Acme Corporation",
  "admin_email": "admin@acme.com",
  "admin_name": "John Doe",
  "admin_password": "securepassword123",
  "plan": "professional"
}
```

Response:
```json
{
  "success": true,
  "tenant": {
    "id": "uuid",
    "slug": "acme-corp",
    "company_name": "Acme Corporation"
  },
  "user": {
    "id": "uuid",
    "email": "admin@acme.com",
    "role": "admin"
  },
  "token": "jwt-token-here"
}
```

### User Login

**POST** `/api/tenant/login`

Login to a specific tenant.

Request:
```json
{
  "email": "user@acme.com",
  "password": "password123",
  "tenant_slug": "acme-corp"  // Optional if email is unique
}
```

Response:
```json
{
  "success": true,
  "tenant": {
    "slug": "acme-corp",
    "company_name": "Acme Corporation"
  },
  "user": {
    "id": "uuid",
    "email": "user@acme.com",
    "role": "admin",
    "name": "John Doe"
  },
  "token": "jwt-token-here"
}
```

### Check Slug Availability

**GET** `/api/company/check/:slug`

Check if a company slug is available.

Response:
```json
{
  "available": true
}
```

### Get Company Info

**GET** `/api/company/:slug`

Get public information about a company.

Response:
```json
{
  "slug": "acme-corp",
  "company_name": "Acme Corporation",
  "status": "active",
  "plan": "professional"
}
```

## Frontend Integration

The login page now has a **Company Signup** flow:

1. User enters company details and creates admin account
2. Backend creates isolated database for that company
3. Admin user is created in the tenant database
4. JWT token includes `tenant_slug` for routing

## Migration from Single-Tenant

If you have existing data in the old single-tenant setup:

1. Create a company for your organization
2. Export users and data from old database
3. Import into new tenant database
4. Update user authentication to use new endpoints

## Security Considerations

- Each tenant has complete data isolation
- Emails can be reused across different companies
- JW Tokens include `tenant_slug` to route requests
- Master database only stores tenant metadata, no user data
- Connection pooling manages tenant database connections

## Troubleshooting

### Issue: "Tenant not found"
- Ensure the company slug exists in master database
- Check `MASTER_DATABASE_URL` is configured correctly

### Issue: "Failed to connect to tenant database"
- Verify tenant database was created successfully
- Check PostgreSQL connection limits
- Ensure migrations ran on tenant database

### Issue: "Address already in use"
- Kill existing processes: `taskkill /F /PID <pid>` (Windows)
- Or: `kill -9 <pid>` (Linux/Mac)

## Production Deployment

For production:

1. **Use managed PostgreSQL** (AWS RDS, Google Cloud SQL, etc.)
2. **Set strong JWT secrets**
3. **Configure database connection limits**
4. **Set up database backups** for each tenant
5. **Monitor tenant database sizes**
6. **Implement tenant suspension/deactivation** logic
7. **Add billing integration** based on usage

## Future Enhancements

- [ ] Tenant user invitations
- [ ] Tenant transfer/migration tools
- [ ] Tenant analytics dashboard
- [ ] Multi-region support
- [ ] Automated database backups per tenant
- [ ] Tenant resource limits/quotas

