# Email Verification System - Complete Implementation Guide

## ✅ Backend Implementation (COMPLETE)

### Overview
New companies must verify their email address before they can log in. This adds an important security layer and ensures valid email addresses.

---

## 🎯 How It Works

### 1. Company Registration
**User Action**: Fills out registration form and clicks "Create Account"

**Backend Process**:
```
POST /api/company/register
{
  "slug": "my-company",
  "company_name": "My Company Inc",
  "admin_email": "admin@mycompany.com",
  "admin_name": "Admin User",
  "admin_password": "password123"
}
```

**What Happens**:
1. Creates isolated database: `auzguard_tenant_my_company`
2. Runs schema migrations
3. Creates admin user with:
   - `email_verified: false`
   - `verification_token`: secure random 64-char hex string
   - `verification_token_expires`: 24 hours from now
4. **Sends verification email** (not welcome email!)
5. Returns success response

**Response**:
```json
{
  "success": true,
  "message": "Company created successfully! Please check your email to verify your account.",
  "email_verification_required": true,
  "tenant": {
    "id": "uuid",
    "slug": "my-company",
    "company_name": "My Company Inc"
  },
  "user": {
    "id": "uuid",
    "email": "admin@mycompany.com",
    "role": "admin",
    "email_verified": false
  },
  "token": "jwt-token"  // Provided but can't login until verified
}
```

---

### 2. Verification Email Sent

**Email Contains**:
- 🎉 Congratulations message
- 🔗 **Verification link**: `http://localhost:3000/verify-email?token=abc123...&email=admin@mycompany.com`
- ⏰ Expiry warning: "This link will expire in 24 hours"
- Beautiful HTML template with branding

**Console Output** (Development Mode):
```
========================================
📧 EMAIL NOTIFICATION (Console Mode)
========================================
From: AuzGuard <noreply@auzguard.com>
To: admin@mycompany.com
Subject: Verify your email - My Company Inc
----------------------------------------

Hi Admin User! 👋

Thank you for creating My Company Inc on AuzGuard!

To complete your registration and secure your account, 
please verify your email address by clicking the link below:

http://localhost:3000/verify-email?token=abc123...&email=admin@mycompany.com

IMPORTANT: This link will expire in 24 hours.
========================================
```

---

### 3. User Clicks Verification Link

**User Action**: Clicks link in email

**Frontend**: Opens `/verify-email?token=abc123...&email=admin@mycompany.com`

**Backend Process**:
```
GET /api/verify-email?token=abc123...&email=admin@mycompany.com
```

**Validation**:
1. ✅ Token and email present?
2. ✅ Find tenant by admin email
3. ✅ Connect to tenant database
4. ✅ Find user with matching email + token
5. ✅ Check token not expired
6. ✅ Check not already verified

**If Valid**:
1. Update user: `email_verified = true`
2. Clear verification token
3. **Send welcome email**
4. Return success

**Response**:
```json
{
  "success": true,
  "message": "Email verified successfully! You can now log in to your account."
}
```

**Welcome Email Sent**:
- 🎉 Welcome message
- 📋 Company details
- 🔗 Login link
- 📝 Next steps guide

---

### 4. User Tries to Login (Before Verification)

**User Action**: Tries to login before verifying email

```
POST /api/tenant/login
{
  "email": "admin@mycompany.com",
  "password": "password123"
}
```

**Backend Checks**:
1. ✅ User exists?
2. ✅ User is active?
3. ✅ Password correct?
4. ❌ **Email verified?** → **BLOCKED!**

**Response** (403 Forbidden):
```json
{
  "error": {
    "code": "EMAIL_NOT_VERIFIED",
    "message": "Please verify your email address before logging in. Check your inbox for the verification link.",
    "email_verified": false
  }
}
```

---

### 5. User Tries to Login (After Verification)

**User Action**: Tries to login after verifying email

```
POST /api/tenant/login
{
  "email": "admin@mycompany.com",
  "password": "password123"
}
```

**Backend Checks**:
1. ✅ User exists?
2. ✅ User is active?
3. ✅ Password correct?
4. ✅ **Email verified?** → **SUCCESS!**

**Response** (200 OK):
```json
{
  "success": true,
  "tenant": {
    "slug": "my-company",
    "company_name": "My Company Inc"
  },
  "user": {
    "id": "uuid",
    "email": "admin@mycompany.com",
    "role": "admin",
    "name": "Admin User"
  },
  "token": "jwt-token"
}
```

---

## 📊 Database Schema

### User Model (Tenant Database)
```prisma
model User {
  id                         String     @id @default(uuid())
  email                      String     @unique
  password_hash              String
  role                       String     @default("viewer")
  name                       String?
  email_verified             Boolean    @default(false)       ← NEW
  verification_token         String?    @unique              ← NEW
  verification_token_expires DateTime?                       ← NEW
  created_at                 DateTime   @default(now())
  updated_at                 DateTime   @updatedAt
  last_login                 DateTime?
  is_active                  Boolean    @default(true)
  user_group_id              String?
  
  @@map("users")
}
```

---

## 🔐 Security Features

1. **Secure Tokens**: 32-byte random hex (64 characters)
2. **Token Expiry**: 24 hours from creation
3. **Unique Tokens**: Database constraint prevents duplicates
4. **Token Clearing**: Removed after verification
5. **Login Blocking**: 403 error prevents unverified login
6. **Already Verified Check**: Prevents duplicate verification

---

## 🧪 Testing the Backend

### Test 1: Create Company
```bash
curl -X POST http://localhost:3001/api/company/register \
  -H "Content-Type: application/json" \
  -d '{
    "slug": "test-company",
    "company_name": "Test Company",
    "admin_email": "admin@test.com",
    "admin_password": "password123"
  }'
```

**Expected**:
- ✅ 200 OK
- ✅ `email_verification_required: true`
- ✅ Verification email logged to console

### Test 2: Try Login (Unverified)
```bash
curl -X POST http://localhost:3001/api/tenant/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "password123"
  }'
```

**Expected**:
- ❌ 403 Forbidden
- ❌ `EMAIL_NOT_VERIFIED` error

### Test 3: Verify Email
```bash
curl "http://localhost:3001/api/verify-email?token=YOUR_TOKEN&email=admin@test.com"
```

**Expected**:
- ✅ 200 OK
- ✅ `Email verified successfully!`
- ✅ Welcome email logged to console

### Test 4: Login (Verified)
```bash
curl -X POST http://localhost:3001/api/tenant/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "password123"
  }'
```

**Expected**:
- ✅ 200 OK
- ✅ JWT token returned
- ✅ Login successful

---

## 📝 Frontend Implementation (TODO)

### 1. Update Registration Success Message

**File**: `frontend/src/pages/Login.tsx`

**After successful registration**, instead of redirecting to dashboard:

```typescript
try {
  const response = await apiClient.registerCompany({...});
  
  // Check if email verification is required
  if (response.email_verification_required) {
    setRegisterSuccess(response.message);
    setRegisterStep('verification-sent');
    // DON'T store token yet
    // DON'T navigate to dashboard
  }
} catch (error) {
  setRegisterError(error.message);
}
```

**UI to Show**:
```jsx
{registerStep === 'verification-sent' && (
  <div className="success-message">
    <h3>✅ Company Created Successfully!</h3>
    <p>We've sent a verification email to {companyAdminEmail}</p>
    <p>Please check your inbox and click the verification link to activate your account.</p>
    <p className="note">
      The link will expire in 24 hours.
    </p>
  </div>
)}
```

---

### 2. Create Email Verification Page

**File**: `frontend/src/pages/VerifyEmail.tsx` (NEW)

```typescript
import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';

export function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const verifyEmail = async () => {
      const token = searchParams.get('token');
      const email = searchParams.get('email');

      if (!token || !email) {
        setStatus('error');
        setMessage('Invalid verification link');
        return;
      }

      try {
        const response = await apiClient.verifyEmail(token, email);
        setStatus('success');
        setMessage(response.message);
        
        // Redirect to login after 3 seconds
        setTimeout(() => navigate('/login'), 3000);
      } catch (error) {
        setStatus('error');
        setMessage(error.message);
      }
    };

    verifyEmail();
  }, [searchParams, navigate]);

  return (
    <div className="verify-email-page">
      {status === 'loading' && (
        <div>
          <Spinner />
          <p>Verifying your email...</p>
        </div>
      )}
      
      {status === 'success' && (
        <div className="success">
          <h1>✅ Email Verified!</h1>
          <p>{message}</p>
          <p>Redirecting to login...</p>
        </div>
      )}
      
      {status === 'error' && (
        <div className="error">
          <h1>❌ Verification Failed</h1>
          <p>{message}</p>
          <button onClick={() => navigate('/login')}>
            Go to Login
          </button>
        </div>
      )}
    </div>
  );
}
```

---

### 3. Add Verification API Method

**File**: `frontend/src/api/client.ts`

```typescript
async verifyEmail(token: string, email: string): Promise<{
  success: boolean;
  message: string;
}> {
  return this.request(
    `/verify-email?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`,
    { method: 'GET' }
  );
}
```

---

### 4. Update Login Error Handling

**File**: `frontend/src/pages/Login.tsx`

```typescript
try {
  await login(loginEmail, loginPassword);
  navigate('/dashboard');
} catch (error) {
  if (error.code === 'EMAIL_NOT_VERIFIED') {
    setLoginError(
      'Please verify your email before logging in. Check your inbox for the verification link.'
    );
  } else {
    setLoginError(error.message);
  }
}
```

---

### 5. Add Route

**File**: `frontend/src/App.tsx` or your routing file

```typescript
<Route path="/verify-email" element={<VerifyEmail />} />
```

---

## 🎯 Complete User Flow

1. **User registers company** on `/login` (Register tab)
   - ✅ Fills form
   - ✅ Clicks "Create Account"
   - ✅ Sees success message: "Check your email!"
   - ❌ **NOT** redirected to dashboard

2. **User checks email**
   - ✅ Receives verification email
   - ✅ Clicks verification link

3. **Verification page** (`/verify-email`)
   - ✅ Shows "Verifying..."
   - ✅ Calls backend API
   - ✅ Shows "Email verified! Redirecting..."
   - ✅ Redirects to `/login` after 3 seconds

4. **User logs in**
   - ✅ Returns to login page
   - ✅ Enters credentials
   - ✅ Login succeeds (email now verified)
   - ✅ Redirected to dashboard

---

## 📧 Email Examples

### Verification Email (Console Mode)
```
========================================
📧 EMAIL NOTIFICATION (Console Mode)
========================================
From: AuzGuard <noreply@auzguard.com>
To: admin@mycompany.com
Subject: Verify your email - My Company Inc
----------------------------------------

Hi Admin User! 👋

Thank you for creating My Company Inc on AuzGuard!

To complete your registration, please click:

http://localhost:3000/verify-email?token=abc123...

⏰ IMPORTANT: This link will expire in 24 hours.
========================================
```

### Welcome Email (After Verification)
```
========================================
📧 EMAIL NOTIFICATION (Console Mode)
========================================
From: AuzGuard <noreply@auzguard.com>
To: admin@mycompany.com
Subject: Welcome to AuzGuard - My Company Inc
----------------------------------------

Hi Admin User! 👋

Congratulations! Your company My Company Inc 
has been successfully set up on AuzGuard.

You now have a completely isolated, secure environment...

Login URL: http://localhost:3000/login

NEXT STEPS:
1. Log in to your dashboard
2. Add team members
3. Configure AI routing policies
...
========================================
```

---

## 🚀 Ready to Complete!

**Backend**: ✅ COMPLETE (committed)
**Frontend**: ⏳ TODO

To finish implementation:
1. Update registration success handling
2. Create `/verify-email` page
3. Add `verifyEmail` API method
4. Update login error handling
5. Test complete flow

Would you like me to implement the frontend parts now?

