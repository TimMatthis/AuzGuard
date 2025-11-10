# Database Upgrade Guide - Users, Groups & Product Access

## Overview

The AuzGuard system has been upgraded to use a proper database-backed user management system. Previously, users were JWT-only (not persisted), user groups were stored in JSON files, and product access groups were in browser localStorage. Now everything is properly stored in PostgreSQL with full relationships.

## What Changed

### 1. **Database Schema (Prisma)**

Added four new tables with proper relationships:

- **`users`** - Stores user accounts with authentication
- **`user_groups`** - Manages user groups with routing and policy assignments  
- **`product_access_groups`** - Defines which UI features users can access
- **`route_profiles`** - Routing configurations (now database-backed instead of JSON file)

### 2. **Backend Services**

#### New Services Created:
- `src/services/users.ts` - User CRUD operations, password management
- `src/services/userGroups.ts` - User group and product access group management

#### Updated Services:
- `src/services/auth.ts` - Now integrates with UserService for database authentication
- `src/services/routingProfiles.ts` - Migrated from file storage to database

### 3. **Backend Routes**

Added new route handler:
- `src/routes/users.ts` - Handles:
  - `/api/auth/login` - Login with email/password
  - `/api/users` - User management (CRUD)
  - `/api/user-groups` - User group management (CRUD)
  - `/api/product-access-groups` - Product access management (CRUD)

Updated:
- `src/routes/routingConfig.ts` - Removed user group management (moved to `/api/user-groups`)

### 4. **Frontend Updates**

- `frontend/src/api/client.ts` - Added new API methods for users, groups, and product access
- `frontend/src/pages/UserGroups.tsx` - Now uses database API instead of file-based data
- `frontend/src/pages/ProductAccessGroups.tsx` - Migrated from localStorage to database API

## Database Schema Relationships

```
┌──────────────────────┐
│ ProductAccessGroup   │
│ - id                 │
│ - name               │
│ - products: JSON[]   │
└──────────┬───────────┘
           │
           │ (one-to-many)
           │
┌──────────▼───────────┐      ┌──────────────────────┐
│ UserGroup            │◄─────┤ RouteProfile         │
│ - id                 │      │ - id                 │
│ - name               │      │ - name               │
│ - product_access_id  │      │ - preferences: JSON  │
│ - route_profile_id   │      └──────────────────────┘
│ - default_pool_id    │
│ - allowed_pools      │
│ - default_policy_id  │
│ - allowed_policies   │
└──────────┬───────────┘
           │
           │ (one-to-many)
           │
┌──────────▼───────────┐
│ User                 │
│ - id                 │
│ - email (unique)     │
│ - password_hash      │
│ - role               │
│ - user_group_id      │
│ - org_id             │
│ - is_active          │
└──────────────────────┘
```

## Setup Instructions

### Step 1: Generate Prisma Client

```bash
npm run db:generate
```

This generates TypeScript types for the new tables.

### Step 2: Run Database Seeder

The seeder creates initial data:

```bash
npm run db:seed
```

This creates:

**Product Access Groups:**
- Full Access (all features)
- Developer Access (dev features)
- Chat Only (chat UI only)

**Routing Profiles:**
- Speed Optimized
- Australian Onshore

**User Groups:**
- Administrators (Full Access + Speed Optimized)
- Developers (Developer Access + Speed Optimized)
- Chat Users (Chat Only + Australian Onshore)

**Test Users:**
| Email | Password | Role | Group |
|-------|----------|------|-------|
| admin@auzguard.com | admin123 | admin | Administrators |
| developer@auzguard.com | dev123 | developer | Developers |
| chat@auzguard.com | chat123 | chat | Chat Users |

### Step 3: Start the Application

```bash
npm run dev
```

### Step 4: Login with Test Account

1. Go to http://localhost:3000
2. Login with `admin@auzguard.com` / `admin123`
3. Navigate to **User Groups** or **Product Access Groups** to manage users

## API Endpoints

### Authentication
```
POST /api/auth/login
Body: { email, password }
Returns: { user, token }
```

### User Management
```
GET    /api/users                 - List all users
GET    /api/users/:id             - Get user details
POST   /api/users                 - Create user
PUT    /api/users/:id             - Update user
DELETE /api/users/:id             - Delete user
POST   /api/users/:id/assign-group - Assign user to group
```

### User Group Management
```
GET    /api/user-groups           - List all groups
GET    /api/user-groups/:id       - Get group details
POST   /api/user-groups           - Create group
PUT    /api/user-groups/:id       - Update group
DELETE /api/user-groups/:id       - Delete group
```

### Product Access Group Management
```
GET    /api/product-access-groups     - List all product access groups
GET    /api/product-access-groups/:id - Get group details
POST   /api/product-access-groups     - Create group
PUT    /api/product-access-groups/:id - Update group
DELETE /api/product-access-groups/:id - Delete group
```

## How It Works

### User Authentication Flow

1. User enters email/password on login page
2. Frontend calls `POST /api/auth/login`
3. Backend verifies credentials against database (bcrypt password check)
4. If valid, backend generates JWT token
5. Frontend stores token and includes it in all subsequent requests
6. Backend validates token on each request and loads user data

### Access Control Flow

1. User is assigned to a **User Group**
2. User Group is linked to a **Product Access Group**
3. Product Access Group defines which UI features the user can access:
   - `dashboard`, `policies`, `simulator`, `audit`, etc.
4. Frontend checks user's product access and shows/hides menu items accordingly
5. Backend checks user's role for API permission enforcement

### Routing Configuration Flow

1. User Group can be assigned a **Routing Profile**
2. Routing Profile contains preferences for AI model selection:
   - Speed vs. cost vs. quality optimization
   - Data residency requirements (e.g., Australian onshore)
   - Latency requirements
3. When a request comes in, system uses user's group routing profile to select appropriate AI model

## Migration Notes

### Data Migration

If you have existing data:

1. **User Groups** were previously in `data/routing_profiles.json`
   - These need to be manually migrated to database
   - Run seeder to create base groups, then add custom groups via UI

2. **Product Access Groups** were in browser localStorage
   - These were client-side only and need to be recreated via UI
   - Seeder creates common templates to start with

3. **Users** were JWT-only (not persisted)
   - Create new user accounts via UI or seeder
   - Users will need to re-register/be re-created

### Breaking Changes

⚠️ **Important:** The following will break without database seeding:

- Login page will fail if no users exist
- User Groups page needs proper database connection
- Product Access Groups page requires database access

## Troubleshooting

### "Prisma Client not generated"

```bash
npm run db:generate
```

### "No users found" on login

```bash
npm run db:seed
```

### "User group not found" errors

The routing profile service no longer manages user groups. Use the new user group service endpoints instead.

### Migration already applied

If you see "migration already applied" errors:
```bash
# Reset and reapply
npm run db:reset
```

## Development Tips

### Creating New Users

**Via API:**
```javascript
POST /api/users
{
  "email": "newuser@example.com",
  "password": "securepassword",
  "role": "developer",
  "user_group_id": "group_id_here"
}
```

**Via Seeder:**
Edit `scripts/seed-users.ts` and add new user entries.

### Creating Custom Product Access Groups

```javascript
POST /api/product-access-groups
{
  "name": "Custom Access",
  "description": "Custom product access",
  "products": ["dashboard", "chat_ui", "settings"]
}
```

### Assigning Users to Groups

```javascript
POST /api/users/:userId/assign-group
{
  "group_id": "group_id_or_null"
}
```

## Security Notes

- Passwords are hashed with bcrypt (12 rounds)
- JWTs expire after 24 hours
- Only admins can create/delete users
- Users can update their own password only
- Product access is enforced both frontend (UI) and backend (API)

## Future Enhancements

Potential improvements:
- Password reset flow
- Email verification
- Multi-factor authentication
- User invitation system
- Audit log for user actions
- Session management (revoke tokens)
- OAuth/SSO integration

---

**Created:** November 10, 2025  
**Version:** 1.0.0  
**Author:** AuzGuard Development Team


