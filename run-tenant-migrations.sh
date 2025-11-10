#!/bin/bash
# Bash script to run tenant database migrations
# This script applies the TenantBranding and email verification migrations

echo "======================================"
echo "AuzGuard Tenant Database Migration"
echo "======================================"
echo ""

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "ERROR: .env file not found!"
    echo "Please create a .env file with your database connection strings."
    exit 1
fi

echo "Step 1: Checking Prisma installation..."
cd prisma/tenant

# Check if prisma is installed
if ! command -v npx &> /dev/null; then
    echo "ERROR: npx is not installed!"
    echo "Run: npm install -g npm"
    exit 1
fi

echo "✓ Prisma is installed"
echo ""

echo "Step 2: Running database migrations..."
echo "This will apply:"
echo "  - TenantBranding table (for company logo and name)"
echo "  - Email verification fields for users"
echo ""

# Run migrations
if npx prisma migrate deploy; then
    echo ""
    echo "✓ Migrations applied successfully!"
    echo ""
else
    echo "ERROR: Migration failed!"
    echo "Check the error message above for details."
    exit 1
fi

echo "Step 3: Generating Prisma Client..."
if npx prisma generate; then
    echo ""
    echo "✓ Prisma Client generated successfully!"
    echo ""
else
    echo "ERROR: Client generation failed!"
    exit 1
fi

cd ../..

echo "======================================"
echo "Migration Complete!"
echo "======================================"
echo ""
echo "Next steps:"
echo "1. Restart your backend server"
echo "2. Login as admin user"
echo "3. Navigate to /users to create users"
echo "4. Navigate to /company-admin to set branding"
echo ""
echo "For detailed instructions, see:"
echo "  - USER_MANAGEMENT_GUIDE.md"
echo "  - IMPLEMENTATION_SUMMARY.md"
echo ""

