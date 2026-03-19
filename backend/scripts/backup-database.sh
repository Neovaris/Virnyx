#!/bin/bash

# Virnyx Database Backup Script
# Creates compressed PostgreSQL backups with automatic cleanup
# Usage: ./backup-database.sh [backup|restore|list|cleanup]

set -e

# Load environment variables
if [ -f .env ]; then
  export $(cat .env | grep -v '#' | xargs)
fi

# Configuration
DB_USER=${POSTGRES_USER:-virnyx}
DB_NAME=${POSTGRES_DB:-virnyx}
DB_HOST=${POSTGRES_HOST:-localhost}
DB_PORT=${POSTGRES_PORT:-5432}
DB_PASSWORD=${POSTGRES_PASSWORD:-virnyxpass}
BACKUP_DIR="./backups"
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-30}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/virnyx_${TIMESTAMP}.sql.gz"

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
  echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

# Backup function
backup_database() {
  log_info "Starting database backup..."
  log_info "Target: $BACKUP_FILE"
  
  export PGPASSWORD=$DB_PASSWORD
  
  if pg_dump -U "$DB_USER" -h "$DB_HOST" -p "$DB_PORT" "$DB_NAME" \
    | gzip > "$BACKUP_FILE"; then
    SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    log_info "✅ Backup completed successfully"
    log_info "File: $BACKUP_FILE"
    log_info "Size: $SIZE"
  else
    log_error "Backup failed!"
    rm -f "$BACKUP_FILE"
    exit 1
  fi
  
  unset PGPASSWORD
}

# Restore function
restore_database() {
  if [ -z "$1" ]; then
    log_error "Please specify backup file to restore"
    log_info "Usage: $0 restore <backup-file>"
    exit 1
  fi
  
  if [ ! -f "$1" ]; then
    log_error "Backup file not found: $1"
    exit 1
  fi
  
  log_warn "⚠️  This will overwrite the current database!"
  read -p "Continue? (yes/no): " confirm
  
  if [ "$confirm" != "yes" ]; then
    log_info "Restore cancelled"
    exit 0
  fi
  
  log_info "Starting database restore from $1..."
  
  export PGPASSWORD=$DB_PASSWORD
  
  if gunzip -c "$1" | psql -U "$DB_USER" -h "$DB_HOST" -p "$DB_PORT" "$DB_NAME"; then
    log_info "✅ Restore completed successfully"
  else
    log_error "Restore failed!"
    exit 1
  fi
  
  unset PGPASSWORD
}

# List backups
list_backups() {
  log_info "Available backups:"
  if [ -d "$BACKUP_DIR" ] && [ "$(ls -A $BACKUP_DIR)" ]; then
    ls -lh "$BACKUP_DIR" | awk 'NR>1 {printf "  %s  %s\n", $5, $9}'
    echo
    log_info "Total backups: $(ls -1 $BACKUP_DIR | wc -l)"
  else
    log_warn "No backups found"
  fi
}

# Cleanup old backups
cleanup_old_backups() {
  log_info "Cleaning up backups older than $RETENTION_DAYS days..."
  
  if [ ! -d "$BACKUP_DIR" ]; then
    log_warn "Backup directory not found"
    return
  fi
  
  DELETED=0
  while IFS= read -r file; do
    log_warn "Removing: $file"
    rm -f "$file"
    ((DELETED++))
  done < <(find "$BACKUP_DIR" -name "virnyx_*.sql.gz" -mtime +$RETENTION_DAYS)
  
  if [ $DELETED -gt 0 ]; then
    log_info "✅ Deleted $DELETED old backup(s)"
  else
    log_info "No old backups to delete"
  fi
}

# Verify database connection
verify_connection() {
  export PGPASSWORD=$DB_PASSWORD
  
  if pg_isready -U "$DB_USER" -h "$DB_HOST" -p "$DB_PORT" >/dev/null 2>&1; then
    log_info "Database connection verified"
  else
    log_error "Cannot connect to database at $DB_HOST:$DB_PORT"
    exit 1
  fi
  
  unset PGPASSWORD
}

# Main command handler
case "${1:-backup}" in
  backup)
    verify_connection
    backup_database
    cleanup_old_backups
    ;;
  restore)
    verify_connection
    restore_database "$2"
    ;;
  list)
    list_backups
    ;;
  cleanup)
    cleanup_old_backups
    ;;
  *)
    echo "Virnyx Database Backup Utility"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  backup       Create a new database backup (default)"
    echo "  restore FILE Restore database from backup file"
    echo "  list         List all available backups"
    echo "  cleanup      Remove backups older than $RETENTION_DAYS days"
    echo ""
    echo "Environment Variables:"
    echo "  POSTGRES_USER              Database user (default: virnyx)"
    echo "  POSTGRES_PASSWORD          Database password"
    echo "  POSTGRES_HOST              Database host (default: localhost)"
    echo "  POSTGRES_PORT              Database port (default: 5432)"
    echo "  POSTGRES_DB                Database name (default: virnyx)"
    echo "  BACKUP_RETENTION_DAYS      Keep backups for N days (default: 30)"
    exit 0
    ;;
esac
