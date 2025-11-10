# User Management & Company Admin Guide

This guide explains how to use the new user management and company admin features in AuzGuard.

## Overview

Two new features have been added:
1. **User Management** - Create and manage users, assign them to user groups
2. **Company Admin** - Upload company logo and set company name

## User Management

### Accessing User Management
Navigate to **Users** from the sidebar menu (requires `manage_users` permission, typically admin role).

### Creating a New User

1. Click the **"Create New User"** button
2. Fill in the required fields:
   - **Email** (required): User's email address
   - **Password** (required): Must be at least 8 characters
   - **Role**: Select viewer, editor, or admin
   - **User Group**: Optionally assign the user to a group
3. Click **"Create User"**

### Managing Existing Users

For each user, you can:
- **Change Role**: Use the dropdown to switch between viewer, editor, admin
- **Assign to User Group**: Select a user group from the dropdown
- **Activate/Deactivate**: Toggle user's active status
- **Delete User**: Remove user from the system (requires confirmation)

### User Information Displayed

- Email address
- Current role
- Assigned user group (if any)
- Creation date
- Last login date

## Company Admin

### Accessing Company Admin
Navigate to **Company Admin** from the sidebar menu (requires `manage_settings` permission, typically admin role).

### Setting Company Name

1. Click **"Edit Branding"**
2. Enter your company name in the **Company Name** field
3. Click **"Save Changes"**

### Uploading a Company Logo

The logo is set via URL. You have several options:

#### Option 1: Image Hosting Services
1. Upload your logo to a service like:
   - Imgur (imgur.com)
   - Cloudinary (cloudinary.com)
   - AWS S3
   - Azure Blob Storage
2. Get the public URL
3. Paste it in the **Company Logo URL** field

#### Option 2: Your Own Website
1. Upload the logo to your company website
2. Use the full URL (e.g., `https://yourcompany.com/logo.png`)

#### Option 3: Data URL (Small Images Only)
1. Convert your image to base64 data URL
2. Use online tools or command line: `base64 image.png`
3. Format: `data:image/png;base64,iVBORw0KG...`

### Logo Recommendations

- **Format**: PNG (with transparency) or SVG preferred
- **Size**: Approximately 200x50 pixels or similar aspect ratio
- **File Size**: Keep under 100KB for best performance
- **Background**: Transparent background works best

### Live Preview

When entering a logo URL, a live preview will appear below the input field to verify the image loads correctly.

## Backend API Endpoints

### User Management API

```typescript
// Get all users
GET /api/users
Query params: ?user_group_id=<id>&is_active=true

// Create user
POST /api/users
Body: { email, password, role?, user_group_id? }

// Update user
PUT /api/users/:id
Body: { email?, password?, role?, user_group_id?, is_active? }

// Delete user
DELETE /api/users/:id

// Assign user to group
POST /api/users/:id/assign-group
Body: { group_id: string | null }
```

### Branding API

```typescript
// Get tenant branding
GET /api/tenant/branding

// Update tenant branding
PUT /api/tenant/branding
Body: { company_name?, logo_url? }
```

## Database Schema

### TenantBranding Table

```sql
CREATE TABLE "tenant_branding" (
    "id" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "logo_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "tenant_branding_pkey" PRIMARY KEY ("id")
);
```

## Permissions

### User Management
- Requires `manage_users` permission (admin role)
- Users can view their own profile regardless of role

### Company Admin
- Requires `manage_settings` permission (admin role)

## Migration Instructions

To apply the database changes:

1. **For existing tenants**, run the migration:
```bash
cd prisma/tenant
npx prisma migrate deploy
```

2. **For new tenants**, the migration will be applied automatically during provisioning.

3. **Generate Prisma Client** after migration:
```bash
cd prisma/tenant
npx prisma generate
```

## Frontend Components

### New Pages
- `frontend/src/pages/Users.tsx` - User management interface
- `frontend/src/pages/CompanyAdmin.tsx` - Company branding interface

### Updated Components
- `frontend/src/App.tsx` - Added routes for new pages
- `frontend/src/components/Layout.tsx` - Added navigation links
- `frontend/src/api/client.ts` - Added API client methods

### Backend Services
- `src/services/branding.ts` - Branding service for database operations
- `src/routes/branding.ts` - Updated with tenant-aware branding endpoints

## Troubleshooting

### Logo Not Displaying
1. Verify the URL is publicly accessible
2. Check browser console for CORS errors
3. Ensure the image format is supported (PNG, JPG, SVG)
4. Try a different image hosting service

### User Creation Fails
1. Check that email is valid format
2. Ensure password is at least 8 characters
3. Verify you have admin permissions
4. Check backend logs for detailed error messages

### Cannot Access New Pages
1. Verify you're logged in with admin role
2. Clear browser cache and refresh
3. Check that routes are properly configured in App.tsx
4. Verify authentication token is valid

## Security Notes

1. **Passwords**: All passwords are hashed using bcrypt before storage
2. **Authentication**: All user management endpoints require valid JWT token
3. **Permissions**: Role-based access control enforced on backend
4. **Tenant Isolation**: Each tenant's data is stored in separate database

## Future Enhancements

Potential improvements for future versions:
- Direct file upload for logos (with storage backend)
- Additional branding options (colors, themes)
- Bulk user import from CSV
- User invitation system via email
- User activity logs and analytics
- Custom role creation and permission management

