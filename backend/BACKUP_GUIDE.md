# Database Backup Recovery Guide

This guide explains how to set up, use, and schedule database backups for Virnyx.

## Overview

The backup system provides:
- **Full database dumps** compressed with gzip
- **Automated cleanup** of old backups
- **Easy restore** functionality
- **Scheduled backups** via cron
- **Backup verification** and connection checking

## Prerequisites

The backup scripts require PostgreSQL client tools to be installed on your system:

### Linux/macOS
```bash
# Ubuntu/Debian
sudo apt-get install postgresql-client

# macOS (via Homebrew)
brew install postgresql
```

### Windows
Install PostgreSQL from: https://www.postgresql.org/download/windows/
- Add PostgreSQL `bin` directory to your PATH

## Quick Start

### Create a Backup

```bash
# Using shell script
./scripts/backup-database.sh backup

# Using TypeScript
npx ts-node scripts/backup-database.ts backup
```

### List Backups

```bash
# Using shell script
./scripts/backup-database.sh list

# Using TypeScript
npx ts-node scripts/backup-database.ts list
```

### Restore from Backup

```bash
# Using shell script
./scripts/backup-database.sh restore ./backups/virnyx_20260318_120000.sql.gz

# Using TypeScript (with confirmation skip)
SKIP_RESTORE_CONFIRM=true npx ts-node scripts/backup-database.ts restore ./backups/virnyx_20260318_120000.sql.gz
```

### Cleanup Old Backups

```bash
# Keep only the last 30 days (default)
./scripts/backup-database.sh cleanup

# Keep only the last 7 days
BACKUP_RETENTION_DAYS=7 ./scripts/backup-database.sh cleanup
```

## Configuration

All configuration is via environment variables (from `.env`):

```env
# Database connection
POSTGRES_USER=virnyx
POSTGRES_PASSWORD=virnyxpass
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=virnyx

# Backup settings
BACKUP_RETENTION_DAYS=30
```

## NPM Scripts

Add these to your `package.json` for convenience:

```json
{
  "scripts": {
    "backup": "node scripts/backup-database.js",
    "backup:ts": "ts-node scripts/backup-database.ts",
    "backup:list": "node scripts/backup-database.js list",
    "backup:restore": "node scripts/backup-database.js restore",
    "backup:cleanup": "node scripts/backup-database.js cleanup"
  }
}
```

Then use:
```bash
npm run backup        # Create backup
npm run backup:list   # List backups
npm run backup:cleanup # Clean old backups
```

## Automated Backups

### Linux (Recommended) - systemd Timer

For the best experience on Linux systems with systemd, use the provided installer script:

```bash
# From the backend directory
sudo chmod +x scripts/setup-backup.sh
sudo ./scripts/setup-backup.sh
```

The setup script will:
- Install backup scripts to `/opt/virnyx/scripts/`
- Set up systemd service and timer units
- Enable daily backups at 2 AM
- Create necessary directories and set permissions

**Configuration:**
```bash
# Edit the .env file with your database credentials
sudo nano /opt/virnyx/.env
```

**Management:**
```bash
# Check timer status
sudo systemctl status virnyx-backup.timer

# View latest backup log
sudo journalctl -u virnyx-backup -n 50

# Run backup immediately
sudo systemctl start virnyx-backup

# Disable automated backups
sudo systemctl disable virnyx-backup.timer

# View next scheduled backup time
sudo systemctl list-timers virnyx-backup.timer
```

### Linux/macOS - Cron (Alternative)

If not using systemd, edit your crontab:
```bash
crontab -e
```

Add a backup job (daily at 2 AM):
```cron
0 2 * * * cd /path/to/virnyx/backend && ./scripts/backup-database.sh backup >> /tmp/virnyx-backup.log 2>&1
```

Backup + cleanup daily at 2 AM:
```cron
0 2 * * * cd /path/to/virnyx/backend && ./scripts/backup-database.sh backup && ./scripts/backup-database.sh cleanup >> /tmp/virnyx-backup.log 2>&1
```

Multiple backups per day (every 6 hours):
```cron
0 */6 * * * cd /path/to/virnyx/backend && ./scripts/backup-database.sh backup >> /tmp/virnyx-backup.log 2>&1
```

### Windows

Use Task Scheduler:

1. Open Task Scheduler
2. Create Basic Task:
   - Name: "Virnyx Database Backup"
   - Trigger: Daily at 2 AM
   - Action: Start a program
   - Program: `C:\Windows\System32\bash.exe` (if using WSL)
   - Arguments: `-c "cd /path/to/virnyx/backend && ./scripts/backup-database.sh backup"`

Or using Node.js:
   - Program: `C:\Program Files\nodejs\node.exe`
   - Arguments: `C:\path\to\virnyx\backend\scripts\backup-database.js backup`

## Docker Container Backups

If running database in Docker:

```bash
# Backup container database
docker exec virnyx_postgres pg_dump -U virnyx virnyx | gzip > backups/virnyx_backup.sql.gz

# Restore to container
gunzip < backups/virnyx_backup.sql.gz | docker exec -i virnyx_postgres psql -U virnyx virnyx
```

## Backup Storage Strategy

### Local Backups
```
backups/
├── virnyx_20260318_120000.sql.gz
├── virnyx_20260318_180000.sql.gz
└── virnyx_20260319_120000.sql.gz
```

### Remote Backups

For production, upload backups to cloud storage:

```bash
# AWS S3
aws s3 cp backups/virnyx_*.sql.gz s3://my-backups/virnyx/

# Google Cloud Storage
gsutil cp backups/virnyx_*.sql.gz gs://my-backups/virnyx/

# Azure Blob Storage
az storage blob upload-batch -d mycontainer -s backups/ \
  --connection-string "DefaultEndpointsProtocol=https;..."
```

### Backup Rotation Script

```bash
#!/bin/bash
# Upload and clean local backups (safe for production)

RETENTION_DAYS=7
BACKUP_DIR=$(pwd)/backups

# Upload to S3
aws s3 sync $BACKUP_DIR s3://my-backups/virnyx/

# Keep local for N days
find $BACKUP_DIR -name "virnyx_*.sql.gz" -mtime +$RETENTION_DAYS -delete

# Verify remote has recent backup
LATEST_LOCAL=$(ls -t $BACKUP_DIR/virnyx_*.sql.gz 2>/dev/null | head -1)
if [ -z "$LATEST_LOCAL" ]; then
  echo "ERROR: No local backup found!"
  exit 1
fi
echo "✓ Backup verified and synced"
```

## Recovery Procedures

### Full Database Recovery

1. **Stop the application**
   ```bash
   npm run dev:stop
   ```

2. **Drop existing database** (if necessary)
   ```bash
   PGPASSWORD=virnyxpass dropdb -U virnyx -h localhost virnyx
   ```

3. **Restore from backup**
   ```bash
   ./scripts/backup-database.sh restore backups/virnyx_20260318_120000.sql.gz
   ```

4. **Restart application**
   ```bash
   npm run dev
   ```

### Partial Recovery (Single Table)

```bash
# Extract table from backup and restore
gunzip -c backups/virnyx_backup.sql.gz | psql -U virnyx -h localhost virnyx \
  -t -c "SELECT * FROM sales WHERE created_at > '2026-03-18'"
```

## Backup Verification

### Test Backup Integrity

```bash
# Verify file is readable and gzipped correctly
gunzip -t backups/virnyx_*.sql.gz

# Count backup size
du -sh backups/*

# Show backup content (first 100 lines)
gunzip -c backups/virnyx_*.sql.gz | head -100
```

### Verify Restore Process

```bash
# Create test database
PGPASSWORD=virnyxpass createdb -U virnyx -h localhost virnyx_test

# Restore to test database
gunzip -c backups/virnyx_backup.sql.gz | PGPASSWORD=virnyxpass psql \
  -U virnyx -h localhost virnyx_test

# Verify tables exist
PGPASSWORD=virnyxpass psql -U virnyx -h localhost virnyx_test \
  -c "\dt"

# Drop test database
PGPASSWORD=virnyxpass dropdb -U virnyx -h localhost virnyx_test
```

## Troubleshooting

### Connection Refused
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```
✓ Ensure PostgreSQL is running
✓ Check POSTGRES_HOST and POSTGRES_PORT in .env

### Permission Denied
```
ERROR: permission denied for schema public
```
✓ Ensure POSTGRES_USER has proper permissions
✓ Restore with appropriate user credentials

### Backup File Corrupted
```bash
# Verify checksum
md5sum backups/virnyx_*.sql.gz

# Try alternative restore method
cat backups/virnyx_backup.sql.gz | gunzip | psql -U virnyx virnyx
```

### Out of Disk Space
```bash
# Clean old backups more aggressively
find ./backups -name "virnyx_*.sql.gz" -mtime +7 -delete

# Compress further
gzip -9 backups/*.sql
```

## Monitoring & Alerts

### Check Backup Age

```bash
#!/bin/bash
LATEST_BACKUP=$(ls -t backups/virnyx_*.sql.gz 2>/dev/null | head -1)
BACKUP_TIME=$(date -d "$(stat -c %y $LATEST_BACKUP | cut -d' ' -f1-2)" +%s)
NOW=$(date +%s)
AGE=$((($NOW - $BACKUP_TIME) / 3600))  # age in hours

if [ $AGE -gt 24 ]; then
  echo "WARNING: Last backup is $AGE hours old!"
  exit 1
fi
```

### Backup Size Alert

```bash
#!/bin/bash
MAX_SIZE_MB=500  # 500 MB limit
LATEST_BACKUP=$(ls -t backups/virnyx_*.sql.gz 2>/dev/null | head -1)
SIZE_MB=$(du -m "$LATEST_BACKUP" | cut -f1)

if [ $SIZE_MB -gt $MAX_SIZE_MB ]; then
  echo "WARNING: Backup is ${SIZE_MB}MB, exceeds limit of ${MAX_SIZE_MB}MB!"
  exit 1
fi
```

## Best Practices

1. **Regular Testing**: Test restore procedures monthly
2. **Offsite Backups**: Keep copies on separate servers/cloud
3. **Encryption**: Encrypt backups in transit and at rest
4. **Monitoring**: Alert if backups fail or are too old
5. **Retention Policy**: Define how long to keep backups
6. **Documentation**: Keep recovery procedures up to date
7. **Versioning**: Include version info in backup names

## References

- [PostgreSQL pg_dump Documentation](https://www.postgresql.org/docs/current/app-pgdump.html)
- [PostgreSQL Recovery Guide](https://www.postgresql.org/docs/current/backup-restore.html)
- [Cron Format Documentation](https://crontab.guru/)
