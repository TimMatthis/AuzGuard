#!/bin/bash
# Import AuzGuard Databases (Linux/Mac)
# This script imports all databases from a backup directory
# Usage: ./scripts/import-database.sh database-backups/backup_20241110_120000

if [ -z "$1" ]; then
    echo "Usage: $0 <backup-directory> [--drop-existing]"
    exit 1
fi

BACKUP_DIR="$1"
DROP_EXISTING="$2"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"

echo "================================================"
echo "AuzGuard Database Import Tool"
echo "================================================"
echo ""

# Check if backup directory exists
if [ ! -d "$BACKUP_DIR" ]; then
    echo "✗ Backup directory not found: $BACKUP_DIR"
    exit 1
fi

# Check if metadata file exists
METADATA_FILE="$BACKUP_DIR/export_metadata.json"
if [ ! -f "$METADATA_FILE" ]; then
    echo "✗ Metadata file not found: $METADATA_FILE"
    exit 1
fi

# Read metadata (basic parsing)
EXPORT_DATE=$(grep "export_date" "$METADATA_FILE" | cut -d'"' -f4)
echo "Backup Date: $EXPORT_DATE"
echo ""

# Warning if dropping existing databases
if [ "$DROP_EXISTING" == "--drop-existing" ]; then
    echo "⚠️  WARNING: You are about to DROP existing databases!"
    echo "This action cannot be undone!"
    read -p "Type 'YES' to continue: " CONFIRM
    if [ "$CONFIRM" != "YES" ]; then
        echo "Import cancelled"
        exit 0
    fi
    echo ""
fi

# Import master database
echo "Importing Master Database..."
MASTER_FILE="$BACKUP_DIR/auzguard_master.sql"

if [ ! -f "$MASTER_FILE" ]; then
    echo "✗ Master database file not found: $MASTER_FILE"
    exit 1
fi

if [ "$DROP_EXISTING" == "--drop-existing" ]; then
    echo "  Dropping existing master database..."
    psql -U "$POSTGRES_USER" -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -d postgres -c "DROP DATABASE IF EXISTS auzguard_master;" > /dev/null 2>&1
fi

# Create master database if it doesn't exist
psql -U "$POSTGRES_USER" -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -d postgres -c "CREATE DATABASE auzguard_master;" > /dev/null 2>&1

# Import master database
psql -U "$POSTGRES_USER" -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -d auzguard_master -f "$MASTER_FILE" -q

if [ $? -eq 0 ]; then
    echo "✓ Master database imported successfully"
else
    echo "✗ Failed to import master database"
    exit 1
fi

# Import tenant databases
echo ""
echo "Importing Tenant Databases..."

for SQL_FILE in "$BACKUP_DIR"/auzguard_tenant_*.sql; do
    if [ ! -f "$SQL_FILE" ]; then
        continue
    fi
    
    DB_NAME=$(basename "$SQL_FILE" .sql)
    
    echo "  Importing: $DB_NAME..."
    
    if [ "$DROP_EXISTING" == "--drop-existing" ]; then
        psql -U "$POSTGRES_USER" -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME;" > /dev/null 2>&1
    fi
    
    # Create database if it doesn't exist
    psql -U "$POSTGRES_USER" -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -d postgres -c "CREATE DATABASE $DB_NAME;" > /dev/null 2>&1
    
    # Import
    psql -U "$POSTGRES_USER" -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -d "$DB_NAME" -f "$SQL_FILE" -q
    
    if [ $? -eq 0 ]; then
        echo "  ✓ Imported: $DB_NAME"
    else
        echo "  ✗ Failed to import: $DB_NAME"
    fi
done

# Summary
echo ""
echo "================================================"
echo "Import Complete!"
echo "================================================"
echo ""
echo "Next steps:"
echo "1. Update your .env file with database credentials"
echo "2. Run: npx prisma generate"
echo "3. Start the application: npm start"

