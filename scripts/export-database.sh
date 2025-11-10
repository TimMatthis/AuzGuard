#!/bin/bash
# Export AuzGuard Databases (Linux/Mac)
# This script exports all databases (master + all tenant databases) to SQL files
# Usage: ./scripts/export-database.sh

OUTPUT_DIR="${1:-database-backups}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="$OUTPUT_DIR/backup_$TIMESTAMP"

echo "================================================"
echo "AuzGuard Database Export Tool"
echo "================================================"
echo ""

# Create backup directory
mkdir -p "$BACKUP_DIR"
echo "✓ Created backup directory: $BACKUP_DIR"
echo ""

# Export master database
echo "Exporting Master Database..."
MASTER_FILE="$BACKUP_DIR/auzguard_master.sql"
pg_dump -U "$POSTGRES_USER" -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -d auzguard_master -f "$MASTER_FILE"

if [ $? -eq 0 ]; then
    SIZE=$(du -h "$MASTER_FILE" | cut -f1)
    echo "✓ Master database exported: $MASTER_FILE ($SIZE)"
else
    echo "✗ Failed to export master database"
    exit 1
fi

# Get list of all tenant databases
echo ""
echo "Querying tenant databases..."

TENANTS=$(psql -U "$POSTGRES_USER" -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -d auzguard_master -t -c "SELECT slug FROM tenants WHERE status = 'active';" | sed 's/^[ \t]*//;s/[ \t]*$//' | grep -v '^$')

if [ -z "$TENANTS" ]; then
    echo "✓ No tenant databases found"
else
    TENANT_COUNT=$(echo "$TENANTS" | wc -l)
    echo "✓ Found $TENANT_COUNT tenant database(s)"
    echo ""
    
    # Export each tenant database
    while IFS= read -r tenant; do
        DB_NAME="auzguard_tenant_$tenant"
        TENANT_FILE="$BACKUP_DIR/$DB_NAME.sql"
        
        echo "Exporting tenant: $tenant..."
        pg_dump -U "$POSTGRES_USER" -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -d "$DB_NAME" -f "$TENANT_FILE"
        
        if [ $? -eq 0 ]; then
            SIZE=$(du -h "$TENANT_FILE" | cut -f1)
            echo "✓ Exported: $DB_NAME ($SIZE)"
        else
            echo "✗ Failed to export: $DB_NAME"
        fi
    done <<< "$TENANTS"
fi

# Create metadata file
echo ""
echo "Creating metadata file..."
PG_VERSION=$(psql -U "$POSTGRES_USER" -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -t -c "SELECT version();" | head -n1 | sed 's/^[ \t]*//;s/[ \t]*$//')

cat > "$BACKUP_DIR/export_metadata.json" <<EOF
{
  "export_date": "$(date '+%Y-%m-%d %H:%M:%S')",
  "databases": {
    "master": "auzguard_master.sql",
    "tenants": [
$(echo "$TENANTS" | sed 's/^/      "auzguard_tenant_/' | sed 's/$/.sql",/' | sed '$ s/,$//')
    ]
  },
  "tenant_count": $TENANT_COUNT,
  "postgres_version": "$PG_VERSION"
}
EOF

echo "✓ Metadata saved"

# Summary
echo ""
echo "================================================"
echo "Export Complete!"
echo "================================================"
echo "Backup location: $BACKUP_DIR"
echo "Master database: auzguard_master.sql"
echo "Tenant databases: $TENANT_COUNT"
echo ""
echo "To restore these databases, use:"
echo "  ./scripts/import-database.sh '$BACKUP_DIR'"

