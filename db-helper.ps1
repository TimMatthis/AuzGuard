# Database Helper Script for AuzGuard
# Quick commands to access databases

$password = 'SuperLong#UniquePassword_ChangeMe'
$env:PGPASSWORD = $password

Write-Host "=== AuzGuard Database Helper ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Choose an option:" -ForegroundColor Yellow
Write-Host "  1) List all databases"
Write-Host "  2) Connect to Master database (tenant registry)"
Write-Host "  3) List all tenants"
Write-Host "  4) Show tenant verification status"
Write-Host "  5) Connect to a specific tenant database"
Write-Host "  6) Show users in a tenant database"
Write-Host ""

$choice = Read-Host "Enter your choice (1-6)"

switch ($choice) {
    "1" {
        Write-Host "`nListing all databases..." -ForegroundColor Green
        psql -h localhost -U postgres -d postgres -c "\l" | Select-String "auzguard"
    }
    "2" {
        Write-Host "`nConnecting to Master database..." -ForegroundColor Green
        Write-Host "Tip: Type \dt to list tables, \q to quit" -ForegroundColor Yellow
        psql -h localhost -U postgres -d auzguard_master
    }
    "3" {
        Write-Host "`nListing all tenants..." -ForegroundColor Green
        psql -h localhost -U postgres -d auzguard_master -c "SELECT slug, company_name, admin_email, admin_email_verified, status FROM tenants ORDER BY created_at DESC;"
    }
    "4" {
        Write-Host "`nShowing tenant verification status..." -ForegroundColor Green
        psql -h localhost -U postgres -d auzguard_master -f query-tenant-status.sql
    }
    "5" {
        Write-Host "`nAvailable tenant databases:" -ForegroundColor Green
        psql -h localhost -U postgres -d postgres -c "\l" | Select-String "auzguard_tenant"
        Write-Host ""
        $tenant = Read-Host "Enter tenant database name (e.g., auzguard_tenant_company_2)"
        Write-Host "`nConnecting to $tenant..." -ForegroundColor Green
        Write-Host "Tip: Type \dt to list tables, \q to quit" -ForegroundColor Yellow
        psql -h localhost -U postgres -d $tenant
    }
    "6" {
        Write-Host "`nAvailable tenant databases:" -ForegroundColor Green
        psql -h localhost -U postgres -d postgres -c "\l" | Select-String "auzguard_tenant"
        Write-Host ""
        $tenant = Read-Host "Enter tenant database name (e.g., auzguard_tenant_company_2)"
        Write-Host "`nShowing users in $tenant..." -ForegroundColor Green
        psql -h localhost -U postgres -d $tenant -c "SELECT email, role, email_verified, is_active, last_login, created_at FROM users;"
    }
    default {
        Write-Host "Invalid choice!" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Done!" -ForegroundColor Green










