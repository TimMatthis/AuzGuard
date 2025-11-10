# Export AuzGuard Databases
# This script exports all databases (master + all tenant databases) to SQL files
# Usage: .\scripts\export-database.ps1

param(
    [string]$OutputDir = "database-backups",
    [string]$PostgresUser = "postgres",
    [string]$PostgresHost = "localhost",
    [string]$PostgresPort = "5432"
)

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupDir = "$OutputDir\backup_$timestamp"

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "AuzGuard Database Export Tool" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Create backup directory
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
Write-Host "[OK] Created backup directory: $backupDir" -ForegroundColor Green
Write-Host ""

# Export master database
Write-Host "Exporting Master Database..." -ForegroundColor Yellow
$masterFile = "$backupDir\auzguard_master.sql"
pg_dump -U $PostgresUser -h $PostgresHost -p $PostgresPort -d auzguard_master -f $masterFile

if ($LASTEXITCODE -eq 0) {
    $size = (Get-Item $masterFile).Length / 1KB
    Write-Host "[OK] Master database exported: $masterFile ($([math]::Round($size, 2)) KB)" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Failed to export master database" -ForegroundColor Red
    exit 1
}

# Get list of all tenant databases
Write-Host ""
Write-Host "Querying tenant databases..." -ForegroundColor Yellow

$query = "SELECT slug FROM tenants WHERE status = 'active';"
$tenants = psql -U $PostgresUser -h $PostgresHost -p $PostgresPort -d auzguard_master -t -c $query | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne "" }

if ($tenants.Count -eq 0) {
    Write-Host "[OK] No tenant databases found" -ForegroundColor Yellow
} else {
    Write-Host "[OK] Found $($tenants.Count) tenant database(s)" -ForegroundColor Green
    Write-Host ""
    
    # Export each tenant database
    foreach ($tenant in $tenants) {
        $dbName = "auzguard_tenant_$tenant"
        $tenantFile = "$backupDir\$dbName.sql"
        
        Write-Host "Exporting tenant: $tenant..." -ForegroundColor Yellow
        pg_dump -U $PostgresUser -h $PostgresHost -p $PostgresPort -d $dbName -f $tenantFile
        
        if ($LASTEXITCODE -eq 0) {
            $size = (Get-Item $tenantFile).Length / 1KB
            Write-Host "[OK] Exported: $dbName ($([math]::Round($size, 2)) KB)" -ForegroundColor Green
        } else {
            Write-Host "[ERROR] Failed to export: $dbName" -ForegroundColor Red
        }
    }
}

# Create metadata file
Write-Host ""
Write-Host "Creating metadata file..." -ForegroundColor Yellow
$metadata = @{
    export_date = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    databases = @{
        master = "auzguard_master.sql"
        tenants = $tenants | ForEach-Object { "auzguard_tenant_$_.sql" }
    }
    tenant_count = $tenants.Count
    postgres_version = (psql -U $PostgresUser -h $PostgresHost -p $PostgresPort -t -c "SELECT version();" | Select-Object -First 1).Trim()
}

$metadata | ConvertTo-Json | Out-File "$backupDir\export_metadata.json"
Write-Host "[OK] Metadata saved" -ForegroundColor Green

# Summary
Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Export Complete!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Backup location: $backupDir" -ForegroundColor White
Write-Host "Master database: auzguard_master.sql" -ForegroundColor White
Write-Host "Tenant databases: $($tenants.Count)" -ForegroundColor White
Write-Host ""
Write-Host "To restore these databases, use:" -ForegroundColor Yellow
Write-Host "  .\scripts\import-database.ps1 -BackupDir '$backupDir'" -ForegroundColor Cyan

