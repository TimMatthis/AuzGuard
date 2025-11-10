# 🗺️ AuzGuard Development Roadmap

**Last Updated**: November 10, 2025  
**Current Status**: Multi-tenant architecture complete, email verification implemented  
**Next Milestone**: Production-ready MVP

---

## 📊 Overall Progress

```
Phase 1: Critical Path (MVP)         ████████░░ 80% (Authentication & Core)
Phase 2: Production Infrastructure   ██░░░░░░░░ 20% (Monitoring & Ops)
Phase 3: User Experience Polish      ░░░░░░░░░░ 0%  (UX & Onboarding)
Phase 4: Business Features           ░░░░░░░░░░ 0%  (Billing & Analytics)
Phase 5: Scale Preparation           ░░░░░░░░░░ 0%  (As Needed)
```

---

## ✅ What's Already Built

### Core Platform (100% Complete)
- ✅ Multi-tenant architecture (database-per-tenant)
- ✅ JWT-based authentication with tenant routing
- ✅ Email verification flow (console mode)
- ✅ User management (CRUD)
- ✅ User groups & permissions
- ✅ Product access groups
- ✅ Role-based access control
- ✅ Policy engine
- ✅ Routing configurator
- ✅ Model pool management
- ✅ Audit logging
- ✅ Decision tracking
- ✅ AI chat playground
- ✅ Simulator
- ✅ Branding customization
- ✅ Connection pooling (basic)
- ✅ Database isolation per tenant
- ✅ Prisma ORM integration

---

# PHASE 1: CRITICAL PATH TO MVP LAUNCH
## 🔴 Priority: CRITICAL
**Timeline**: Week 1-2 (20-30 hours)  
**Goal**: Production-ready authentication and user management

---

## 1.1 Complete Email Infrastructure ⚡ CRITICAL
**Priority**: 🔴 URGENT (Do First)  
**Time**: 20 minutes  
**Complexity**: Low  
**Status**: ⏳ TODO

### Why Critical
Email verification is fully implemented but only logs to console. Users can't actually receive emails.

### Current State
- ✅ Email templates (verification, welcome) - Beautiful HTML
- ✅ Email service architecture
- ✅ Verification flow
- ❌ Production email provider

### Implementation Options

#### Option A: SendGrid (Recommended)
```bash
1. Sign up: https://sendgrid.com/ (Free: 100 emails/day)
2. Get API key from Settings → API Keys
3. Add to .env:
   EMAIL_PROVIDER=sendgrid
   SENDGRID_API_KEY=SG.xxxxx
   EMAIL_FROM=noreply@yourdomain.com
```

#### Option B: AWS SES
```bash
1. AWS Console → SES
2. Verify domain
3. Get credentials
4. Add to .env:
   EMAIL_PROVIDER=aws_ses
   AWS_ACCESS_KEY_ID=xxx
   AWS_SECRET_ACCESS_KEY=xxx
   AWS_REGION=us-east-1
```

### Files to Check
- `src/services/email.ts` (lines 389, 407) - Already has integration code
- `.env` - Just add credentials

### Testing
- [ ] Create company account
- [ ] Receive verification email in inbox
- [ ] Click link and verify
- [ ] Receive welcome email
- [ ] Check HTML rendering

---

## 1.2 Resend Verification Email ⚡ HIGH PRIORITY
**Priority**: 🔴 URGENT  
**Time**: 2-3 hours  
**Complexity**: Medium  
**Status**: ⏳ TODO

### Why Important
Users WILL lose verification emails (spam, accidental deletion, delivery failure).

### Features
- POST `/resend-verification` endpoint
- Rate limiting (3 attempts per 15 minutes)
- Button on login page when email not verified
- Security: Don't reveal if email exists
- Generate new token (invalidate old)

### Implementation Files
```
Backend:
- src/routes/tenants.ts (add endpoint)

Frontend:
- frontend/src/api/client.ts (add method)
- frontend/src/pages/Login.tsx (add button)
```

### User Flow
1. User tries to login → sees "verify email" error
2. Clicks "Resend verification email"
3. New email sent with new token
4. Old token becomes invalid
5. User verifies with new token

---

## 1.3 Forgot Password / Password Reset ⚡ CRITICAL
**Priority**: 🔴 CRITICAL  
**Time**: 4-5 hours  
**Complexity**: Medium  
**Status**: ⏳ TODO

### Why Critical
Absolutely essential for production. Users will forget passwords.

### Database Changes Needed
```prisma
model User {
  // ... existing fields ...
  password_reset_token        String?    @unique
  password_reset_expires      DateTime?
}
```

### Implementation
1. **Backend Endpoints**:
   - `POST /auth/forgot-password` - Request reset
   - `POST /auth/reset-password` - Complete reset

2. **Email Template**: Password reset email with link

3. **Frontend Pages**:
   - `/forgot-password` - Request reset form
   - `/reset-password` - New password form

4. **Schema Migration**: Add reset token columns to existing tenants

### Security Features
- 24-hour token expiry
- One-time use tokens
- Don't reveal if email exists
- Log IP address in email
- Clear token after use

### Files to Create/Modify
```
NEW:
- frontend/src/pages/ForgotPassword.tsx
- frontend/src/pages/ResetPassword.tsx
- scripts/add-password-reset-columns.sql

MODIFY:
- prisma/tenant/schema.prisma
- src/routes/tenants.ts
- src/services/email.ts
- frontend/src/api/client.ts
- frontend/src/App.tsx
- frontend/src/pages/Login.tsx (add link)
```

---

## 1.4 User Profile Page ⚡ HIGH PRIORITY
**Priority**: 🟡 HIGH  
**Time**: 4-6 hours  
**Complexity**: Medium  
**Status**: ⏳ TODO

### Why Important
Users need to manage their own account without admin help.

### Features
- View/edit name
- View email (read-only)
- Change password
- View account info (created, last login)
- Account deletion (with confirmation)
- Activity log (optional)

### Implementation
**New Page**: `frontend/src/pages/Profile.tsx`

**Sections**:
1. **Profile Information**
   - Name (editable)
   - Email (read-only)
   - Role (read-only)
   - Created date

2. **Security**
   - Change password (current + new)
   - Two-factor auth (future)

3. **Danger Zone**
   - Delete account (with confirmation modal)

**Backend Endpoints** (may already exist):
```typescript
GET    /api/user/profile         // Get own profile
PUT    /api/user/profile         // Update name
POST   /api/user/change-password // Change password
DELETE /api/user/account         // Delete account
```

---

## 1.5 Team Member Invitations ⚡ HIGH PRIORITY
**Priority**: 🟡 HIGH  
**Time**: 6-8 hours  
**Complexity**: High  
**Status**: ⏳ TODO

### Why Important
Essential for multi-user companies. Users need to add their team.

### Database
Already exists in `schema-master.prisma`:
```prisma
model TenantInvitation {
  id         String   @id @default(uuid())
  tenant_id  String
  email      String
  role       String   @default("viewer")
  token      String   @unique
  expires_at DateTime
  used_at    DateTime?
}
```

### Features
1. **Admin Invites User**
   - Enter email and role
   - Generate unique invitation token
   - Send invitation email
   - 7-day expiry

2. **User Accepts Invitation**
   - Click link in email
   - Create account (name + password)
   - Auto-join correct tenant
   - Email pre-verified (via invitation)

3. **Invitation Management**
   - List pending invitations
   - Resend invitation
   - Cancel invitation
   - View accepted invitations

### Implementation

**Backend Endpoints**:
```typescript
POST   /api/tenant/invite           // Admin invites user
POST   /api/tenant/accept-invite    // User accepts
GET    /api/tenant/invitations      // List all invitations
POST   /api/tenant/invite/:id/resend // Resend invitation
DELETE /api/tenant/invite/:id       // Cancel invitation
```

**Email Template**: Invitation email with personalized link

**Frontend Pages**:
```
NEW:
- frontend/src/pages/TeamMembers.tsx  // Admin view
- frontend/src/pages/AcceptInvite.tsx // Acceptance flow

MODIFY:
- frontend/src/pages/Settings.tsx     // Add team tab
```

### User Flow
1. Admin → Settings → Team Members
2. Click "Invite Member"
3. Enter email, select role
4. Invitation sent
5. New user receives email
6. Clicks link → `/accept-invite?token=xxx`
7. Creates account (in correct tenant)
8. Auto-logged in

---

## 1.6 Admin User Management UI ⚡ MEDIUM PRIORITY
**Priority**: 🟢 MEDIUM  
**Time**: 2-3 hours  
**Complexity**: Low  
**Status**: ⏳ TODO (Verify & Polish)

### Why Important
Admins need a clean UI to manage team members.

### Current Status
- ✅ Backend routes exist and work
- ✅ User service is tenant-aware
- ⏳ Frontend may need polish

### Tasks
1. Verify Settings → Users page works
2. Test create/edit/deactivate user
3. Verify role assignment works
4. Add user activity display
5. Add last login timestamp
6. Polish UI/UX

### Enhancement Ideas
- Bulk user import (CSV)
- User activity timeline
- Filter by role/status
- Search users
- Export user list

---

## 📊 Phase 1 Summary

| Task | Priority | Time | Depends On |
|------|----------|------|------------|
| 1.1 Production Email | 🔴 CRITICAL | 20 min | None |
| 1.2 Resend Verification | 🔴 URGENT | 2-3 hrs | 1.1 |
| 1.3 Forgot Password | 🔴 CRITICAL | 4-5 hrs | 1.1 |
| 1.4 User Profile | 🟡 HIGH | 4-6 hrs | None |
| 1.5 Team Invitations | 🟡 HIGH | 6-8 hrs | 1.1 |
| 1.6 Admin UI Polish | 🟢 MEDIUM | 2-3 hrs | None |

**Total Time**: 20-30 hours = 1-2 weeks

### Recommended Schedule

**Week 1 (Critical)**:
- Day 1: Production email (20 min)
- Day 1-2: Forgot password (4-5 hrs)
- Day 2: Resend verification (2-3 hrs)
- Day 3: User profile (4-6 hrs)

**Week 2 (Important)**:
- Day 4-5: Team invitations (6-8 hrs)
- Day 5: Admin UI polish (2-3 hrs)
- Day 5: Testing & bug fixes

---

# PHASE 2: PRODUCTION INFRASTRUCTURE
## 🟡 Priority: HIGH
**Timeline**: Week 3-4 (15-20 hours)  
**Goal**: Production monitoring, reliability, and security

---

## 2.1 Monitoring & Logging 📊
**Priority**: 🔴 CRITICAL  
**Time**: 4-6 hours  
**Complexity**: Medium  
**Status**: ⏳ TODO

### Why Critical
You need to know when things break BEFORE users complain.

### Implementation Options

#### Option A: Cloud Service (Easier)
```bash
# Datadog
npm install dd-trace
# Sign up: https://www.datadoghq.com/

# New Relic
npm install newrelic
# Sign up: https://newrelic.com/

# Configuration automatic with API key
```

#### Option B: Self-Hosted (Cheaper)
```bash
# Prometheus + Grafana
docker-compose up prometheus grafana

# Already have docker-compose.yml
```

### Metrics to Track
- Request rate (per tenant)
- Response times (p50, p95, p99)
- Error rates
- Database connection count
- Active tenants
- CPU/Memory usage
- Email delivery rate

### Implementation

**Add Metrics Middleware**:
```typescript
// src/middleware/metrics.ts
import promClient from 'prom-client';

const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code', 'tenant']
});

const tenantActiveUsers = new promClient.Gauge({
  name: 'tenant_active_users',
  help: 'Number of active users per tenant',
  labelNames: ['tenant']
});
```

**Add Endpoint**:
```typescript
fastify.get('/metrics', async (req, reply) => {
  reply.type('text/plain');
  return register.metrics();
});
```

### Dashboards to Create
1. **System Overview**
   - Total requests/min
   - Error rate
   - Response times
   - Active tenants

2. **Per-Tenant Metrics**
   - Request volume
   - Active users
   - Database queries
   - API usage

3. **Database Health**
   - Connection pool usage
   - Query performance
   - Slow queries
   - Lock waits

---

## 2.2 Automated Backups 💾
**Priority**: 🔴 CRITICAL  
**Time**: 3-4 hours  
**Complexity**: Medium  
**Status**: ⏳ TODO

### Why Critical
Data loss = business over. Backups are non-negotiable.

### Backup Strategy

**What to Backup**:
1. Master database (tenant registry) - CRITICAL
2. All tenant databases - HIGH
3. Uploaded files/assets - MEDIUM
4. Configuration - MEDIUM

**Backup Schedule**:
- **Daily**: Full backup of all databases
- **Hourly**: Incremental/WAL archiving (optional)
- **Real-time**: Streaming replication (production)

### Implementation

**Create Backup Script**:
```bash
#!/bin/bash
# scripts/backup-tenants.sh

BACKUP_DIR="/backups/$(date +%Y%m%d)"
mkdir -p $BACKUP_DIR

# Backup master database
echo "Backing up master database..."
pg_dump -h localhost -U postgres auzguard_master | gzip > $BACKUP_DIR/master.sql.gz

# Get all active tenant databases
TENANTS=$(psql -h localhost -U postgres -d auzguard_master -t -c \
  "SELECT database_name FROM tenants WHERE status='active';")

# Backup each tenant
for tenant in $TENANTS; do
  echo "Backing up $tenant..."
  pg_dump -h localhost -U postgres $tenant | gzip > $BACKUP_DIR/$tenant.sql.gz
done

# Upload to S3
aws s3 sync $BACKUP_DIR s3://your-bucket/backups/$(date +%Y%m%d)/

# Keep last 30 days locally
find /backups -mtime +30 -delete

echo "Backup complete!"
```

**Schedule with Cron**:
```bash
# Run daily at 2 AM
0 2 * * * /path/to/scripts/backup-tenants.sh >> /var/log/backups.log 2>&1
```

**Restore Script**:
```bash
#!/bin/bash
# scripts/restore-tenant.sh

TENANT_NAME=$1
BACKUP_DATE=$2

if [ -z "$TENANT_NAME" ] || [ -z "$BACKUP_DATE" ]; then
  echo "Usage: ./restore-tenant.sh <tenant_name> <backup_date>"
  exit 1
fi

BACKUP_FILE="/backups/$BACKUP_DATE/${TENANT_NAME}.sql.gz"

echo "Restoring $TENANT_NAME from $BACKUP_DATE..."
gunzip -c $BACKUP_FILE | psql -h localhost -U postgres -d $TENANT_NAME

echo "Restore complete!"
```

### Backup Verification
- [ ] Test restore weekly
- [ ] Monitor backup success/failure
- [ ] Alert on backup failures
- [ ] Document restore procedure

---

## 2.3 Health Checks & Status Page 🏥
**Priority**: 🟡 HIGH  
**Time**: 3-4 hours  
**Complexity**: Low  
**Status**: ⏳ TODO

### Why Important
Know system health at a glance. Essential for debugging and uptime monitoring.

### Implementation

**Health Check Endpoints**:

```typescript
// src/routes/health.ts

// Basic health check (for load balancers)
fastify.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// Detailed health check
fastify.get('/health/detailed', async (req, reply) => {
  const checks = {
    database: await checkDatabase(),
    redis: await checkRedis(),
    email: await checkEmailService(),
    disk: await checkDiskSpace(),
    memory: getMemoryUsage(),
    uptime: process.uptime()
  };

  const allHealthy = Object.values(checks)
    .every(c => c.status === 'ok');

  reply.status(allHealthy ? 200 : 503);
  
  return {
    status: allHealthy ? 'healthy' : 'degraded',
    checks,
    timestamp: new Date().toISOString()
  };
});

// Tenant-specific health
fastify.get('/health/tenant/:slug', async (req, reply) => {
  try {
    const tenantPrisma = await connectionManager.getTenantConnection(
      req.params.slug
    );
    
    const start = Date.now();
    await tenantPrisma.$queryRaw`SELECT 1`;
    const latency = Date.now() - start;
    
    return {
      status: 'ok',
      tenant: req.params.slug,
      latency_ms: latency
    };
  } catch (error) {
    reply.status(503);
    return {
      status: 'error',
      tenant: req.params.slug,
      error: error.message
    };
  }
});

// Readiness check (for k8s)
fastify.get('/ready', async (req, reply) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { ready: true };
  } catch {
    reply.status(503);
    return { ready: false };
  }
});

// Liveness check (for k8s)
fastify.get('/live', async () => {
  return { alive: true };
});
```

**Helper Functions**:

```typescript
async function checkDatabase(): Promise<HealthCheck> {
  try {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const latency = Date.now() - start;
    
    return {
      status: 'ok',
      latency_ms: latency,
      message: 'Database responsive'
    };
  } catch (error) {
    return {
      status: 'error',
      message: error.message
    };
  }
}

function getMemoryUsage(): HealthCheck {
  const usage = process.memoryUsage();
  const usedMB = Math.round(usage.heapUsed / 1024 / 1024);
  const totalMB = Math.round(usage.heapTotal / 1024 / 1024);
  
  return {
    status: usedMB < totalMB * 0.9 ? 'ok' : 'warning',
    used_mb: usedMB,
    total_mb: totalMB,
    percentage: Math.round((usedMB / totalMB) * 100)
  };
}
```

### Public Status Page (Optional)

Create a simple status page at `/status`:

```html
<!DOCTYPE html>
<html>
<head>
  <title>AuzGuard Status</title>
  <style>
    body { font-family: sans-serif; max-width: 800px; margin: 50px auto; }
    .status { padding: 20px; border-radius: 8px; margin: 10px 0; }
    .ok { background: #d4edda; color: #155724; }
    .error { background: #f8d7da; color: #721c24; }
  </style>
</head>
<body>
  <h1>🟢 AuzGuard Status</h1>
  <div id="status">Loading...</div>
  <script>
    fetch('/health/detailed')
      .then(r => r.json())
      .then(data => {
        document.getElementById('status').innerHTML = 
          Object.entries(data.checks).map(([name, check]) => 
            `<div class="status ${check.status}">${name}: ${check.status}</div>`
          ).join('');
      });
  </script>
</body>
</html>
```

---

## 2.4 Rate Limiting ⏱️
**Priority**: 🟡 HIGH  
**Time**: 1-2 hours  
**Complexity**: Low  
**Status**: ⏳ TODO

### Why Important
Prevent abuse, DDoS attacks, and resource exhaustion.

### Implementation

```bash
npm install @fastify/rate-limit
```

```typescript
// src/server.ts
import rateLimit from '@fastify/rate-limit';

// Global rate limiting
await fastify.register(rateLimit, {
  global: true,
  max: 100,              // requests per timeWindow
  timeWindow: '1 minute',
  cache: 10000,          // cache size
  
  // Per-tenant rate limiting
  keyGenerator: (request) => {
    return request.user?.tenant_slug || request.ip;
  },
  
  errorResponseBuilder: (request, context) => {
    return {
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: `Too many requests. Please try again in ${context.after}.`,
        retryAfter: context.after
      }
    };
  }
});

// Stricter rate limit for auth endpoints
fastify.register(async function(fastify) {
  fastify.register(rateLimit, {
    max: 5,
    timeWindow: '15 minutes'
  });
  
  fastify.post('/api/auth/login', loginHandler);
  fastify.post('/api/company/register', registerHandler);
  fastify.post('/api/auth/forgot-password', forgotPasswordHandler);
});

// API endpoint rate limits (per tenant)
fastify.register(async function(fastify) {
  fastify.register(rateLimit, {
    max: 1000,
    timeWindow: '1 hour',
    keyGenerator: (request) => request.user?.tenant_slug || 'anonymous'
  });
  
  // All API routes
  fastify.register(apiRoutes, { prefix: '/api' });
});
```

### Rate Limit Tiers (Optional)

```typescript
const RATE_LIMITS = {
  free: { max: 100, window: '1 hour' },
  starter: { max: 1000, window: '1 hour' },
  pro: { max: 10000, window: '1 hour' },
  enterprise: { max: 100000, window: '1 hour' }
};

// Apply based on tenant plan
keyGenerator: async (request) => {
  const tenant = await getTenantInfo(request.user?.tenant_slug);
  return `${tenant.slug}:${tenant.plan}`;
}
```

---

## 2.5 Error Tracking (Sentry) 🐛
**Priority**: 🟡 HIGH  
**Time**: 1-2 hours  
**Complexity**: Low  
**Status**: ⏳ TODO

### Why Important
Catch bugs in production before users report them.

### Implementation

```bash
npm install @sentry/node @sentry/profiling-node
```

```typescript
// src/server.ts
import * as Sentry from '@sentry/node';
import { ProfilingIntegration } from '@sentry/profiling-node';

// Initialize Sentry
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
  profilesSampleRate: 1.0,
  
  integrations: [
    new ProfilingIntegration(),
  ],
  
  beforeSend(event, hint) {
    // Add tenant context
    if (event.user) {
      event.tags = {
        ...event.tags,
        tenant: event.user.tenant_slug
      };
    }
    
    // Don't send errors from health checks
    if (event.request?.url?.includes('/health')) {
      return null;
    }
    
    return event;
  }
});

// Add error handler
fastify.setErrorHandler((error, request, reply) => {
  // Log to Sentry
  Sentry.captureException(error, {
    user: {
      id: request.user?.id,
      email: request.user?.email,
      tenant: request.user?.tenant_slug
    },
    tags: {
      method: request.method,
      url: request.url
    },
    extra: {
      body: request.body,
      query: request.query,
      params: request.params
    }
  });
  
  // Log locally
  fastify.log.error(error);
  
  // Send response
  const statusCode = error.statusCode || 500;
  reply.status(statusCode).send({
    error: {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production'
        ? 'An error occurred'
        : error.message
    }
  });
});

// Add request context
fastify.addHook('onRequest', (request, reply, done) => {
  Sentry.configureScope((scope) => {
    scope.setUser({
      id: request.user?.id,
      email: request.user?.email
    });
    scope.setTag('tenant', request.user?.tenant_slug);
  });
  done();
});
```

### Sentry Dashboard Setup
1. Create alerts for error spikes
2. Set up Slack/email notifications
3. Configure issue grouping
4. Add release tracking
5. Set up performance monitoring

---

## 2.6 Security Hardening 🔐
**Priority**: 🟡 HIGH  
**Time**: 2-3 hours  
**Complexity**: Medium  
**Status**: ⏳ TODO

### Security Checklist

#### HTTP Headers
```bash
npm install @fastify/helmet
```

```typescript
import helmet from '@fastify/helmet';

await fastify.register(helmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:']
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});
```

#### CORS Configuration
```typescript
import cors from '@fastify/cors';

await fastify.register(cors, {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
});
```

#### Input Validation
```bash
npm install @fastify/type-provider-typebox @sinclair/typebox
```

```typescript
import { Type } from '@sinclair/typebox';

fastify.post('/api/users', {
  schema: {
    body: Type.Object({
      email: Type.String({ format: 'email' }),
      password: Type.String({ minLength: 8 }),
      role: Type.Enum(['admin', 'user', 'viewer'])
    })
  }
}, handler);
```

#### SQL Injection Prevention
✅ Already protected - Using Prisma ORM (parameterized queries)

#### XSS Prevention
✅ Already protected - React escapes by default

#### CSRF Protection
```bash
npm install @fastify/csrf-protection
```

```typescript
import csrf from '@fastify/csrf-protection';

await fastify.register(csrf);
```

---

## 📊 Phase 2 Summary

| Task | Priority | Time | Dependencies |
|------|----------|------|--------------|
| 2.1 Monitoring | 🔴 CRITICAL | 4-6 hrs | None |
| 2.2 Backups | 🔴 CRITICAL | 3-4 hrs | None |
| 2.3 Health Checks | 🟡 HIGH | 3-4 hrs | None |
| 2.4 Rate Limiting | 🟡 HIGH | 1-2 hrs | None |
| 2.5 Error Tracking | 🟡 HIGH | 1-2 hrs | None |
| 2.6 Security | 🟡 HIGH | 2-3 hrs | None |

**Total Time**: 15-21 hours = 1 week

---

# PHASE 3: USER EXPERIENCE POLISH
## 🟢 Priority: MEDIUM
**Timeline**: Month 2 (30-40 hours)  
**Goal**: Delightful user experience and smooth onboarding

---

## 3.1 Onboarding Flow 🎓
**Time**: 8-10 hours  
**Status**: ⏳ TODO

### Why Important
First impressions matter. Guide new users to success.

### Features

#### Welcome Screen (After Email Verification)
```
Welcome to AuzGuard! 🎉

Let's get you set up in 3 quick steps:
1. Configure your first policy
2. Add your team
3. Test AI routing

[Start Setup] [Skip for now]
```

#### Step 1: First Policy
- Choose from templates (Compliance, Security, Cost)
- Simple configuration wizard
- Test with sample request
- Save & activate

#### Step 2: Team Setup
- Invite team members
- Assign roles
- Set permissions

#### Step 3: Test Routing
- Interactive demo
- Send test requests
- View results
- Celebrate success! 🎊

### Implementation
```typescript
// Track onboarding progress in tenant settings
{
  onboarding: {
    completed: false,
    steps: {
      policy: false,
      team: false,
      test: false
    },
    skipped: false
  }
}
```

---

## 3.2 Company Settings Page ⚙️
**Time**: 6-8 hours  
**Status**: ⏳ TODO

### Sections

#### 1. Company Information
- Company name (editable)
- Company logo upload
- Industry/vertical
- Company size
- Website

#### 2. Subscription & Billing
- Current plan
- Usage statistics
- Upgrade/downgrade
- Payment method
- Billing history

#### 3. Team Settings
- Default role for new members
- Invitation settings
- Team size limit

#### 4. Security Settings
- Password policy
- Session timeout
- IP whitelist (enterprise)
- Two-factor auth requirement

#### 5. Danger Zone
- Delete company
- Export all data
- Transfer ownership

---

## 3.3 Activity Feed & Notifications 📬
**Time**: 8-10 hours  
**Status**: ⏳ TODO

### Features

#### Activity Feed
- Real-time activity stream
- Filter by user, type, date
- Export activity
- Pagination

#### Notification Types
- New team member joined
- Policy changed
- High error rate detected
- Unusual API usage
- Billing alert
- Security alert

#### Notification Channels
- In-app notifications
- Email digests (daily/weekly)
- Slack integration
- Webhook integration

### Implementation
```typescript
// Add to tenant schema
model Notification {
  id         String   @id @default(uuid())
  user_id    String
  type       String   // 'info', 'warning', 'error', 'success'
  title      String
  message    String
  read       Boolean  @default(false)
  data       Json?
  created_at DateTime @default(now())
  
  user User @relation(fields: [user_id], references: [id])
}

model Activity {
  id          String   @id @default(uuid())
  user_id     String
  action      String   // 'created', 'updated', 'deleted'
  entity_type String   // 'policy', 'user', 'group'
  entity_id   String
  metadata    Json?
  created_at  DateTime @default(now())
}
```

---

## 3.4 Advanced Search & Filtering 🔍
**Time**: 6-8 hours  
**Status**: ⏳ TODO

### Features

#### Global Search Bar
- Search across policies, users, audit logs
- Real-time suggestions
- Recent searches
- Keyboard shortcuts (Cmd+K)

#### Policy Search
- Search by name, description, rules
- Filter by status, jurisdiction
- Sort by date, usage

#### Audit Log Search
- Full-text search
- Date range picker
- Filter by user, action, result
- Export filtered results

#### User Search
- Search by name, email, role
- Filter by status, group
- Sort by activity, join date

---

## 3.5 Bulk Operations 📦
**Time**: 6-8 hours  
**Status**: ⏳ TODO

### Features

#### Bulk User Import
- CSV upload
- Email + Role + Group
- Validation & preview
- Auto-send invitations
- Error handling

#### Bulk User Operations
- Select multiple users
- Assign to group
- Change role
- Deactivate/activate
- Delete

#### Bulk Policy Updates
- Apply changes to multiple policies
- Bulk enable/disable
- Copy policy to multiple jurisdictions

### CSV Format Example
```csv
email,name,role,group
john@example.com,John Doe,admin,Engineering
jane@example.com,Jane Smith,user,Product
bob@example.com,Bob Johnson,viewer,Support
```

---

## 3.6 Improved Dashboard 📊
**Time**: 6-8 hours  
**Status**: ⏳ TODO

### Widgets

#### Usage Overview
- Total API calls today/week/month
- Active users
- Top models
- Response times

#### Policy Performance
- Most used policies
- Policy execution times
- Success/failure rates

#### Team Activity
- Recent user actions
- New team members
- Active sessions

#### Cost Tracking
- Estimated costs
- Top cost drivers
- Usage trends

#### Quick Actions
- Create policy
- Invite user
- Run test
- View docs

---

## 📊 Phase 3 Summary

| Feature | Time | Value |
|---------|------|-------|
| 3.1 Onboarding | 8-10 hrs | HIGH |
| 3.2 Company Settings | 6-8 hrs | MEDIUM |
| 3.3 Activity Feed | 8-10 hrs | HIGH |
| 3.4 Search & Filter | 6-8 hrs | MEDIUM |
| 3.5 Bulk Operations | 6-8 hrs | MEDIUM |
| 3.6 Dashboard | 6-8 hrs | HIGH |

**Total Time**: 40-52 hours = 3-4 weeks

---

# PHASE 4: BUSINESS FEATURES
## 🔵 Priority: MEDIUM-LOW
**Timeline**: Month 3-4 (60-80 hours)  
**Goal**: Monetization and advanced features

---

## 4.1 Billing & Subscriptions 💳
**Time**: 12-16 hours  
**Status**: ⏳ TODO

### Subscription Tiers

```typescript
const PLANS = {
  free: {
    name: 'Free',
    price: 0,
    features: {
      maxUsers: 3,
      maxPolicies: 5,
      apiCalls: 10000,
      support: 'community'
    }
  },
  starter: {
    name: 'Starter',
    price: 49,
    features: {
      maxUsers: 10,
      maxPolicies: 20,
      apiCalls: 100000,
      support: 'email'
    }
  },
  pro: {
    name: 'Professional',
    price: 149,
    features: {
      maxUsers: 50,
      maxPolicies: 100,
      apiCalls: 1000000,
      support: 'priority'
    }
  },
  enterprise: {
    name: 'Enterprise',
    price: null, // Custom
    features: {
      maxUsers: -1, // Unlimited
      maxPolicies: -1,
      apiCalls: -1,
      support: 'dedicated'
    }
  }
};
```

### Stripe Integration

```bash
npm install stripe
```

```typescript
// src/services/billing.ts
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export class BillingService {
  async createCheckoutSession(tenantId: string, plan: string) {
    const session = await stripe.checkout.sessions.create({
      customer_email: tenant.admin_email,
      payment_method_types: ['card'],
      line_items: [{
        price: PLAN_PRICE_IDS[plan],
        quantity: 1,
      }],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL}/billing/success`,
      cancel_url: `${process.env.FRONTEND_URL}/billing/cancel`,
      metadata: { tenant_id: tenantId }
    });
    
    return session;
  }
  
  async handleWebhook(event: Stripe.Event) {
    switch (event.type) {
      case 'checkout.session.completed':
        await this.activateSubscription(event.data.object);
        break;
      case 'invoice.payment_failed':
        await this.handlePaymentFailure(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await this.cancelSubscription(event.data.object);
        break;
    }
  }
}
```

### Features
- Upgrade/downgrade plans
- Usage-based billing (API calls)
- Invoice generation
- Payment history
- Usage alerts
- Trial periods

---

## 4.2 Analytics Dashboard 📈
**Time**: 10-12 hours  
**Status**: ⏳ TODO

### Metrics to Track

#### Usage Analytics
- API calls over time
- Request distribution by endpoint
- Response time percentiles
- Error rates

#### Model Analytics
- Model usage by provider
- Average latency per model
- Cost per model
- Success rates

#### Policy Analytics
- Policy execution frequency
- Most/least used policies
- Policy performance
- Rule trigger rates

#### User Analytics
- Active users
- User activity heatmap
- Feature usage
- Session duration

### Implementation

```typescript
// Aggregate metrics daily
model DailyMetrics {
  id         String   @id @default(uuid())
  date       DateTime @db.Date
  tenant_id  String
  
  // API metrics
  total_requests      Int
  successful_requests Int
  failed_requests     Int
  avg_response_time   Float
  
  // Model metrics
  model_calls         Json // { "gpt-4": 100, "claude": 50 }
  estimated_cost      Float
  
  // User metrics
  active_users        Int
  new_users           Int
  
  @@unique([date, tenant_id])
}
```

---

## 4.3 Public API 🔌
**Time**: 16-20 hours  
**Status**: ⏳ TODO

### Features

#### API Key Management
- Generate API keys
- Revoke API keys
- Set permissions per key
- Rate limits per key
- Usage tracking

#### API Endpoints for Tenants
```typescript
// Tenant API (for their customers)
POST   /api/v1/evaluate    // Evaluate policy
GET    /api/v1/policies    // List policies
POST   /api/v1/audit       // Log custom event
GET    /api/v1/models      // List available models
POST   /api/v1/route       // Route AI request
```

#### API Documentation
- Swagger/OpenAPI spec
- Interactive API explorer
- Code examples (curl, JS, Python)
- Authentication guide
- Rate limits documentation

---

## 4.4 Webhooks 🪝
**Time**: 8-10 hours  
**Status**: ⏳ TODO

### Webhook Events

```typescript
// Webhook events tenants can subscribe to
const WEBHOOK_EVENTS = {
  'policy.evaluated': 'Policy was evaluated',
  'policy.created': 'New policy created',
  'policy.updated': 'Policy updated',
  'user.created': 'New user added',
  'user.deleted': 'User removed',
  'audit.logged': 'Audit event logged',
  'threshold.exceeded': 'Usage threshold exceeded',
  'error.occurred': 'Error occurred'
};
```

### Implementation

```typescript
// src/services/webhooks.ts
export class WebhookService {
  async trigger(event: string, data: any, tenantId: string) {
    const webhooks = await prisma.webhook.findMany({
      where: {
        tenant_id: tenantId,
        events: { has: event },
        enabled: true
      }
    });
    
    for (const webhook of webhooks) {
      await this.send(webhook, event, data);
    }
  }
  
  private async send(webhook: Webhook, event: string, data: any) {
    const payload = {
      event,
      data,
      timestamp: new Date().toISOString(),
      webhook_id: webhook.id
    };
    
    const signature = this.generateSignature(payload, webhook.secret);
    
    try {
      await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature
        },
        body: JSON.stringify(payload)
      });
      
      await this.logDelivery(webhook.id, 'success');
    } catch (error) {
      await this.logDelivery(webhook.id, 'failed', error);
    }
  }
}
```

---

## 4.5 Compliance & Audit Export 📋
**Time**: 8-10 hours  
**Status**: ⏳ TODO

### Features

#### Audit Log Export
- Export as CSV/JSON/PDF
- Date range selection
- Filter by user/action
- Scheduled exports

#### Compliance Reports
- GDPR compliance report
- SOC 2 audit trail
- HIPAA activity log
- Custom report builder

#### Data Export (GDPR Right to Data)
- Export all user data
- Export all policies
- Export all audit logs
- Encrypted archive

### Implementation

```typescript
// Generate compliance report
fastify.post('/api/reports/compliance', async (request, reply) => {
  const { startDate, endDate, format } = request.body;
  
  const data = await generateComplianceReport(
    request.user.tenant_slug,
    startDate,
    endDate
  );
  
  if (format === 'pdf') {
    const pdf = await generatePDF(data);
    reply.type('application/pdf');
    return pdf;
  }
  
  return data;
});
```

---

## 4.6 Integrations 🔗
**Time**: 12-16 hours  
**Status**: ⏳ TODO

### Slack Integration
- Post audit events to Slack
- Alert on errors
- Daily digest
- Approval workflows

### Microsoft Teams Integration
- Similar to Slack

### SSO Integration
- SAML 2.0
- OAuth 2.0
- Azure AD
- Okta
- Google Workspace

---

## 📊 Phase 4 Summary

| Feature | Time | Priority |
|---------|------|----------|
| 4.1 Billing | 12-16 hrs | HIGH |
| 4.2 Analytics | 10-12 hrs | MEDIUM |
| 4.3 Public API | 16-20 hrs | HIGH |
| 4.4 Webhooks | 8-10 hrs | MEDIUM |
| 4.5 Audit Export | 8-10 hrs | HIGH |
| 4.6 Integrations | 12-16 hrs | LOW |

**Total Time**: 66-84 hours = 4-6 weeks

---

# PHASE 5: SCALE PREPARATION
## 🟣 Priority: AS NEEDED
**Timeline**: As you grow (40+ hours)  
**Goal**: Handle 1,000+ tenants and high traffic

---

## 5.1 Connection Pooling (PgBouncer) 🔄
**Time**: 4-6 hours  
**Trigger**: 100+ tenants OR connection issues  
**Status**: ⏳ FUTURE

### Why Needed
PostgreSQL connection limit will be reached. PgBouncer pools connections efficiently.

### Implementation

```yaml
# docker-compose.yml
services:
  pgbouncer:
    image: pgbouncer/pgbouncer:latest
    environment:
      DATABASES_HOST: postgres
      DATABASES_PORT: 5432
      DATABASES_USER: postgres
      DATABASES_PASSWORD: ${DB_PASSWORD}
      DATABASES_DBNAME: * # All databases
      PGBOUNCER_POOL_MODE: transaction
      PGBOUNCER_MAX_CLIENT_CONN: 10000
      PGBOUNCER_DEFAULT_POOL_SIZE: 25
      PGBOUNCER_MAX_DB_CONNECTIONS: 100
    ports:
      - "6432:6432"
    depends_on:
      - postgres
```

### Update Connection Strings
```typescript
// Change from:
DATABASE_URL=postgresql://user:pass@localhost:5432/db

// To:
DATABASE_URL=postgresql://user:pass@localhost:6432/db
```

---

## 5.2 Redis Caching 🚀
**Time**: 8-12 hours  
**Trigger**: 500+ tenants OR slow response times  
**Status**: ⏳ FUTURE

### Use Cases
- Session storage
- Query result caching
- Rate limit storage
- Job queue
- Real-time features

### Implementation

```bash
npm install ioredis
```

```typescript
// src/services/cache.ts
import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD
});

export class CacheService {
  async get<T>(key: string): Promise<T | null> {
    const value = await redis.get(key);
    return value ? JSON.parse(value) : null;
  }
  
  async set(key: string, value: any, ttl: number = 3600) {
    await redis.setex(key, ttl, JSON.stringify(value));
  }
  
  async invalidate(pattern: string) {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }
}
```

### Caching Strategy
```typescript
// Cache tenant info (rarely changes)
async getTenantInfo(slug: string) {
  const cached = await cache.get(`tenant:${slug}`);
  if (cached) return cached;
  
  const tenant = await db.tenant.findUnique({ where: { slug } });
  await cache.set(`tenant:${slug}`, tenant, 3600); // 1 hour
  
  return tenant;
}
```

---

## 5.3 Background Jobs (BullMQ) ⚙️
**Time**: 12-16 hours  
**Trigger**: Slow operations OR async workflows needed  
**Status**: ⏳ FUTURE

### Use Cases
- Async tenant provisioning
- Email queue
- Report generation
- Data exports
- Cleanup tasks

### Implementation

```bash
npm install bullmq
```

```typescript
// src/jobs/tenantProvisioning.job.ts
import { Queue, Worker } from 'bullmq';

const connection = {
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT
};

// Create queue
export const tenantQueue = new Queue('tenant-provisioning', { connection });

// Add job
export async function queueTenantCreation(data: CreateTenantInput) {
  const job = await tenantQueue.add('create-tenant', data, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    }
  });
  
  return job.id;
}

// Process jobs
const worker = new Worker('tenant-provisioning', async (job) => {
  console.log(`Processing job ${job.id}`);
  
  await job.updateProgress(10);
  
  // Create database
  await createDatabase(job.data.slug);
  await job.updateProgress(40);
  
  // Run migrations
  await runMigrations(job.data.slug);
  await job.updateProgress(70);
  
  // Create admin user
  await createAdminUser(job.data);
  await job.updateProgress(100);
  
  return { success: true };
}, { connection });

// Monitor job status
export async function getJobStatus(jobId: string) {
  const job = await tenantQueue.getJob(jobId);
  return {
    status: await job?.getState(),
    progress: job?.progress,
    result: await job?.returnvalue
  };
}
```

---

## 5.4 Database Sharding 🗄️
**Time**: 20-30 hours  
**Trigger**: 5,000+ tenants  
**Status**: ⏳ FUTURE

### Strategy
Distribute tenants across multiple PostgreSQL servers.

```typescript
// Shard configuration
const SHARDS = [
  {
    id: 'shard-1',
    region: 'us-east-1',
    host: 'db1.example.com',
    capacity: 2000,
    current: 1456
  },
  {
    id: 'shard-2',
    region: 'us-west-1',
    host: 'db2.example.com',
    capacity: 2000,
    current: 892
  },
  {
    id: 'shard-3',
    region: 'eu-west-1',
    host: 'db3.example.com',
    capacity: 2000,
    current: 1123
  }
];

// Choose shard for new tenant
function selectShard(region?: string): Shard {
  if (region) {
    // Geographic proximity
    return findNearestShard(region);
  }
  
  // Load balancing
  return findLeastLoadedShard();
}
```

### Store Shard Info in Master DB
```prisma
model Tenant {
  // ... existing fields ...
  shard_id     String
  shard_region String
}
```

---

## 5.5 Read Replicas 📚
**Time**: 8-12 hours  
**Trigger**: Heavy read load OR analytics queries slow  
**Status**: ⏳ FUTURE

### Setup
```typescript
// Primary database (writes)
const primaryDb = new PrismaClient({
  datasources: {
    db: { url: process.env.DATABASE_URL }
  }
});

// Read replica (reads)
const replicaDb = new PrismaClient({
  datasources: {
    db: { url: process.env.DATABASE_READ_URL }
  }
});

// Use replica for read-heavy operations
async function getTenantAnalytics(tenantId: string) {
  return await replicaDb.metrics.findMany({
    where: { tenant_id: tenantId },
    orderBy: { date: 'desc' },
    take: 30
  });
}
```

---

## 5.6 CDN & Asset Optimization 🌐
**Time**: 4-6 hours  
**Trigger**: Global users OR slow asset loading  
**Status**: ⏳ FUTURE

### Implementation
- CloudFront / CloudFlare
- Optimize images (WebP, compression)
- Minify JS/CSS
- Enable gzip/brotli
- Cache static assets

---

## 5.7 Kubernetes Deployment ☸️
**Time**: 20-30 hours  
**Trigger**: Need auto-scaling OR high availability  
**Status**: ⏳ FUTURE

### Benefits
- Auto-scaling
- Load balancing
- Health checks
- Rolling updates
- Self-healing

---

## 📊 Phase 5 Summary

| Feature | Time | Trigger | Priority |
|---------|------|---------|----------|
| 5.1 PgBouncer | 4-6 hrs | 100+ tenants | HIGH |
| 5.2 Redis | 8-12 hrs | 500+ tenants | MEDIUM |
| 5.3 Background Jobs | 12-16 hrs | Async needs | MEDIUM |
| 5.4 Sharding | 20-30 hrs | 5,000+ tenants | LOW |
| 5.5 Read Replicas | 8-12 hrs | Heavy reads | LOW |
| 5.6 CDN | 4-6 hrs | Global users | LOW |
| 5.7 Kubernetes | 20-30 hrs | Enterprise scale | LOW |

**Total Time**: 76-112 hours (implement as needed)

---

# 🎯 OVERALL ROADMAP SUMMARY

## Quick Reference

| Phase | Focus | Time | When |
|-------|-------|------|------|
| **Phase 1** | Critical Auth Features | 20-30 hrs | NOW (Week 1-2) |
| **Phase 2** | Production Infrastructure | 15-20 hrs | Week 3-4 |
| **Phase 3** | UX Polish | 30-40 hrs | Month 2 |
| **Phase 4** | Business Features | 60-80 hrs | Month 3-4 |
| **Phase 5** | Scale Prep | As needed | As you grow |

## Total Estimates

```
MVP Ready (Phase 1 + 2):    35-50 hours   = 2-3 weeks
Production Ready:           50-70 hours   = 3-4 weeks
Feature Complete (1-4):     125-170 hours = 8-12 weeks
Enterprise Scale (+5):      +76-112 hours = As needed
```

---

## 📅 30-DAY LAUNCH PLAN

### Week 1: Critical Foundation
- [ ] Day 1: Production email (20 min) ⚡
- [ ] Day 1-2: Forgot password (4 hrs)
- [ ] Day 2: Resend verification (2 hrs)
- [ ] Day 3-4: User profile (4-6 hrs)
- [ ] Day 5: Team invitations (6-8 hrs)

### Week 2: Production Infrastructure
- [ ] Day 8-9: Monitoring (4-6 hrs)
- [ ] Day 10: Backups (3-4 hrs)
- [ ] Day 11: Health checks (3-4 hrs)
- [ ] Day 12: Rate limiting (1-2 hrs)
- [ ] Day 13: Error tracking (1-2 hrs)
- [ ] Day 14: Security hardening (2-3 hrs)

### Week 3: Testing & Polish
- [ ] Day 15-17: End-to-end testing
- [ ] Day 18-19: Bug fixes
- [ ] Day 20-21: Documentation

### Week 4: Beta & Launch
- [ ] Day 22-25: Beta testing with real users
- [ ] Day 26-28: Final polish
- [ ] Day 29: Security audit
- [ ] Day 30: 🚀 LAUNCH!

---

## 🚀 LAUNCH CRITERIA

### MVP Launch (Beta Users)
- [x] Multi-tenant architecture
- [x] Email verification
- [x] User authentication
- [ ] Production email provider
- [ ] Forgot password
- [ ] Team invitations
- [ ] Monitoring
- [ ] Backups
- [ ] Rate limiting

### Public Launch
All MVP items plus:
- [ ] Onboarding flow
- [ ] Company settings
- [ ] Analytics dashboard
- [ ] Error tracking
- [ ] Health checks
- [ ] Documentation
- [ ] Security audit

---

## 📞 Need Help?

**This Roadmap**: Comprehensive guide with priorities, estimates, and code examples.

**Next Steps**:
1. Review Phase 1 priorities
2. Set up production email (20 min)
3. Start implementing in order
4. Track progress in this document

**Questions?** Update the checklist as you complete items!

---

**Document Version**: 1.0  
**Last Updated**: November 10, 2025  
**Status**: Ready for implementation  
**Next Action**: Phase 1.1 - Set up production email provider

