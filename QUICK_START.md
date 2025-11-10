# Quick Start: User Management & Company Admin

## 🚀 Getting Started in 3 Steps

### Step 1: Run Database Migrations

**Windows (PowerShell):**
```powershell
.\run-tenant-migrations.ps1
```

**Linux/Mac:**
```bash
chmod +x run-tenant-migrations.sh
./run-tenant-migrations.sh
```

**Manual (if scripts don't work):**
```bash
cd prisma/tenant
npx prisma migrate deploy
npx prisma generate
cd ../..
```

### Step 2: Restart Backend Server

```bash
npm run dev
```

### Step 3: Access New Features

1. **Login** as admin user at `http://localhost:3000/login`
2. **Create Users** at `http://localhost:3000/users`
3. **Set Branding** at `http://localhost:3000/company-admin`

## ✨ What's New

### User Management (`/users`)
- ✅ Create new users
- ✅ Assign users to groups
- ✅ Change user roles (viewer/editor/admin)
- ✅ Activate/deactivate users
- ✅ Delete users

### Company Admin (`/company-admin`)
- ✅ Set company name
- ✅ Upload company logo (via URL)
- ✅ Live preview

## 📝 Quick Examples

### Creating a User
1. Go to `/users`
2. Click "Create New User"
3. Enter email: `user@example.com`
4. Enter password: `password123` (min 8 chars)
5. Select role: `viewer`
6. Select group: (optional)
7. Click "Create User"

### Setting Company Logo
1. Go to `/company-admin`
2. Click "Edit Branding"
3. Enter company name: `My Company`
4. Enter logo URL: `https://example.com/logo.png`
5. Check preview
6. Click "Save Changes"

### Where to Get Logo URL
- **Imgur**: Upload to imgur.com, get direct link
- **Cloudinary**: Upload to cloudinary.com
- **AWS S3**: Upload to S3, make public, use URL
- **Your website**: `https://yoursite.com/logo.png`

## 🔑 Permissions

| Feature | Required Permission | Default Role |
|---------|-------------------|--------------|
| Create Users | `manage_users` | admin |
| Edit Users | `manage_users` | admin |
| Company Branding | `manage_settings` | admin |
| View Own Profile | (none) | all users |

## 📚 Documentation

- **USER_MANAGEMENT_GUIDE.md** - Full feature documentation
- **IMPLEMENTATION_SUMMARY.md** - Technical details
- **QUICK_START.md** - This file

## ⚠️ Important Notes

1. **First Time Setup**: Run migrations before using features
2. **Admin Access**: Only admin users can access these pages
3. **Logo URLs**: Must be publicly accessible
4. **Password Security**: Minimum 8 characters required

## 🐛 Troubleshooting

**Can't see new menu items?**
- Verify you're logged in as admin
- Clear browser cache and reload

**Logo not displaying?**
- Check URL is publicly accessible
- Try different image hosting
- Check browser console for errors

**Migration errors?**
- Verify database connection in `.env`
- Check you're in project root directory
- Ensure database is running

## 💡 Tips

1. **Test with Test User**: Create a test user first to verify everything works
2. **Logo Size**: Keep logos small (under 100KB) for best performance
3. **Backup First**: Always backup your database before running migrations
4. **Use PNG**: PNG format with transparency works best for logos

## 🎯 Next Steps

After setup:
1. Create your admin users
2. Create user groups (if needed)
3. Assign users to groups
4. Set your company branding
5. Test login with new users

## 📞 Need Help?

Check these files:
- `USER_MANAGEMENT_GUIDE.md` - Detailed usage guide
- `IMPLEMENTATION_SUMMARY.md` - Technical implementation details
- Backend logs for API errors
- Browser console for frontend errors

---

**Everything working?** You're all set! 🎉

Navigate to `/users` to start creating users and `/company-admin` to customize your branding.


