# Import AuzGuard Databases
# This script imports all databases from a backup directory
# Usage: .\scripts\import-database.ps1 -BackupDir "database-backups\backup_20241110_120000"

param(
    [Parameter(Mandatory=$true)]
    [string]$BackupDir,
    [string]$PostgresUser = "postgres",
    [string]$PostgresHost = "localhost",
    [string]$PostgresPort = "5432",
    [switch]$DropExisting = $false
)

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "AuzGuard Database Import Tool" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Check if backup directory exists
if (-not (Test-Path $BackupDir)) {
    Write-Host "[ERROR] Backup directory not found: $BackupDir" -ForegroundColor Red
    exit 1
}

# Check if metadata file exists
$metadataFile = "$BackupDir\export_metadata.json"
if (-not (Test-Path $metadataFile)) {
    Write-Host "[ERROR] Metadata file not found: $metadataFile" -ForegroundColor Red
    exit 1
}

# Read metadata
$metadata = Get-Content $metadataFile | ConvertFrom-Json
Write-Host "Backup Date: $($metadata.export_date)" -ForegroundColor White
Write-Host "Databases: $($metadata.tenant_count + 1) ($($metadata.tenant_count) tenants + 1 master)" -ForegroundColor White
Write-Host ""

# Warning if dropping existing databases
if ($DropExisting) {
    Write-Host "[WARNING] You are about to DROP existing databases!" -ForegroundColor Red
    Write-Host "This action cannot be undone!" -ForegroundColor Red
    $confirm = Read-Host "Type 'YES' to continue"
    if ($confirm -ne "YES") {
        Write-Host "Import cancelled" -ForegroundColor Yellow
        exit 0
    }
    Write-Host ""
}

# Import master database
Write-Host "Importing Master Database..." -ForegroundColor Yellow
$masterFile = "$BackupDir\auzguard_master.sql"

if (-not (Test-Path $masterFile)) {
    Write-Host "[ERROR] Master database file not found: $masterFile" -ForegroundColor Red
    exit 1
}

if ($DropExisting) {
    Write-Host "  Dropping existing master database..." -ForegroundColor Yellow
    psql -U $PostgresUser -h $PostgresHost -p $PostgresPort -d postgres -c "DROP DATABASE IF EXISTS auzguard_master;" | Out-Null
}

# Create master database if it doesn't exist
psql -U $PostgresUser -h $PostgresHost -p $PostgresPort -d postgres -c "CREATE DATABASE auzguard_master;" 2>$null

# Import master database
psql -U $PostgresUser -h $PostgresHost -p $PostgresPort -d auzguard_master -f $masterFile -q

if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Master database imported successfully" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Failed to import master database" -ForegroundColor Red
    exit 1
}

# Import tenant databases
if ($metadata.databases.tenants.Count -gt 0) {
    Write-Host ""
    Write-Host "Importing Tenant Databases..." -ForegroundColor Yellow
    
    foreach ($tenantFile in $metadata.databases.tenants) {
        $fullPath = "$BackupDir\$tenantFile"
        $dbName = [System.IO.Path]::GetFileNameWithoutExtension($tenantFile)
        
        if (-not (Test-Path $fullPath)) {
            Write-Host "  [ERROR] File not found: $tenantFile" -ForegroundColor Red
            continue
        }
        
        Write-Host "  Importing: $dbName..." -ForegroundColor Yellow
        
        if ($DropExisting) {
            psql -U $PostgresUser -h $PostgresHost -p $PostgresPort -d postgres -c "DROP DATABASE IF EXISTS $dbName;" | Out-Null
        }
        
        # Create database if it doesn't exist
        psql -U $PostgresUser -h $PostgresHost -p $PostgresPort -d postgres -c "CREATE DATABASE $dbName;" 2>$null
        
        # Import
        psql -U $PostgresUser -h $PostgresHost -p $PostgresPort -d $dbName -f $fullPath -q
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  [OK] Imported: $dbName" -ForegroundColor Green
        } else {
            Write-Host "  [ERROR] Failed to import: $dbName" -ForegroundColor Red
        }
    }
}

# Summary
Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Import Complete!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Update your .env file with database credentials" -ForegroundColor White
Write-Host "2. Run: npx prisma generate" -ForegroundColor White
Write-Host "3. Start the application: npm start" -ForegroundColor White

