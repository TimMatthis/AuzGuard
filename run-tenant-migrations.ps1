# PowerShell script to run tenant database migrations
# This script applies the TenantBranding and email verification migrations

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "AuzGuard Tenant Database Migration" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Check if .env file exists
if (-not (Test-Path ".env")) {
    Write-Host "ERROR: .env file not found!" -ForegroundColor Red
    Write-Host "Please create a .env file with your database connection strings." -ForegroundColor Red
    exit 1
}

Write-Host "Step 1: Checking Prisma installation..." -ForegroundColor Yellow
Push-Location prisma/tenant

# Check if prisma is installed
try {
    $prismaVersion = npx prisma --version 2>&1 | Select-String "prisma" | Select-Object -First 1
    Write-Host "✓ Prisma is installed" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "ERROR: Prisma is not installed!" -ForegroundColor Red
    Write-Host "Run: npm install" -ForegroundColor Yellow
    Pop-Location
    exit 1
}

Write-Host "Step 2: Running database migrations..." -ForegroundColor Yellow
Write-Host "This will apply:" -ForegroundColor White
Write-Host "  - TenantBranding table (for company logo and name)" -ForegroundColor White
Write-Host "  - Email verification fields for users" -ForegroundColor White
Write-Host ""

# Run migrations
try {
    npx prisma migrate deploy
    Write-Host ""
    Write-Host "✓ Migrations applied successfully!" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "ERROR: Migration failed!" -ForegroundColor Red
    Write-Host "Check the error message above for details." -ForegroundColor Red
    Pop-Location
    exit 1
}

Write-Host "Step 3: Generating Prisma Client..." -ForegroundColor Yellow
try {
    npx prisma generate
    Write-Host ""
    Write-Host "✓ Prisma Client generated successfully!" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "ERROR: Client generation failed!" -ForegroundColor Red
    Pop-Location
    exit 1
}

Pop-Location

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Migration Complete!" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Restart your backend server" -ForegroundColor White
Write-Host "2. Login as admin user" -ForegroundColor White
Write-Host "3. Navigate to /users to create users" -ForegroundColor White
Write-Host "4. Navigate to /company-admin to set branding" -ForegroundColor White
Write-Host ""
Write-Host "For detailed instructions, see:" -ForegroundColor Cyan
Write-Host "  - USER_MANAGEMENT_GUIDE.md" -ForegroundColor White
Write-Host "  - IMPLEMENTATION_SUMMARY.md" -ForegroundColor White
Write-Host ""

