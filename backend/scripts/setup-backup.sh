#!/bin/bash

# Virnyx Database Backup Setup Script
# Sets up automated backup infrastructure on Linux systems with systemd
# 
# Usage: sudo chmod +x setup-backup.sh && sudo ./setup-backup.sh
#
# This script will:
# 1. Copy backup scripts to /opt/virnyx/backups/
# 2. Create systemd service and timer units
# 3. Enable automatic backups to run daily at 2 AM
# 4. Create necessary directories and validate permissions

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
INSTALL_PATH="/opt/virnyx"
BACKUPS_PATH="$INSTALL_PATH/backups"
SCRIPTS_PATH="$INSTALL_PATH/scripts"
SERVICE_NAME="virnyx-backup"
TIMER_NAME="virnyx-backup"

# Helper functions
log_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

log_success() {
    echo -e "${GREEN}✓${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
    log_error "This script must be run as root (use: sudo)"
    exit 1
fi

log_info "========================================="
log_info "Virnyx Database Backup Setup"
log_info "========================================="

# Step 1: Create directories
log_info "Step 1: Creating backup directories..."
mkdir -p "$BACKUPS_PATH"
mkdir -p "$SCRIPTS_PATH"
log_success "Directories created at $INSTALL_PATH"

# Step 2: Copy backup scripts
log_info "Step 2: Installing backup scripts..."

# Detect if running from git repo or other location
if [ -f "./scripts/backup-database.sh" ]; then
    SCRIPT_SOURCE_DIR="./scripts"
    log_info "Found scripts in current directory ($(pwd))"
elif [ -f "../backend/scripts/backup-database.sh" ]; then
    SCRIPT_SOURCE_DIR="../backend/scripts"
    log_info "Found scripts in ../backend/scripts"
elif [ -f "../../backend/scripts/backup-database.sh" ]; then
    SCRIPT_SOURCE_DIR="../../backend/scripts"
    log_info "Found scripts in ../../backend/scripts"
else
    log_error "Could not find backup scripts. Please run this script from the Virnyx project directory."
    exit 1
fi

cp "$SCRIPT_SOURCE_DIR/backup-database.sh" "$SCRIPTS_PATH/"
cp "$SCRIPT_SOURCE_DIR/backup-database.ts" "$SCRIPTS_PATH/"
chmod +x "$SCRIPTS_PATH/backup-database.sh"
log_success "Backup scripts copied to $SCRIPTS_PATH"

# Step 3: Create systemd service and timer
log_info "Step 3: Setting up systemd service and timer..."

# Read service and timer content from current location
if [ ! -f "$SCRIPT_SOURCE_DIR/virnyx-backup.service" ]; then
    log_error "virnyx-backup.service not found in $SCRIPT_SOURCE_DIR"
    exit 1
fi

if [ ! -f "$SCRIPT_SOURCE_DIR/virnyx-backup.timer" ]; then
    log_error "virnyx-backup.timer not found in $SCRIPT_SOURCE_DIR"
    exit 1
fi

# Install service file
SERVICE_CONTENT=$(cat "$SCRIPT_SOURCE_DIR/virnyx-backup.service")
SERVICE_CONTENT="${SERVICE_CONTENT//\/opt\/virnyx/$INSTALL_PATH}"
echo "$SERVICE_CONTENT" > "/etc/systemd/system/$SERVICE_NAME.service"
log_success "Systemd service installed"

# Install timer file
TIMER_CONTENT=$(cat "$SCRIPT_SOURCE_DIR/virnyx-backup.timer")
echo "$TIMER_CONTENT" > "/etc/systemd/system/$TIMER_NAME.timer"
log_success "Systemd timer installed"

# Step 4: Load and enable systemd units
log_info "Step 4: Enabling systemd units..."
systemctl daemon-reload
systemctl enable "$TIMER_NAME.timer"
log_success "Timer enabled (will start on next boot)"

# Step 5: Create .env file if needed
log_info "Step 5: Checking for .env configuration..."
if [ ! -f "$INSTALL_PATH/.env" ]; then
    log_warning "No .env file found at $INSTALL_PATH/.env"
    log_info "Creating template .env file..."
    
    cat > "$INSTALL_PATH/.env.template" << 'EOF'
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password_here
DB_NAME=virnyx

# Backup Configuration
BACKUP_DIR=/opt/virnyx/backups
RETENTION_DAYS=30

# Optional: For TypeScript version
NODE_ENV=production
EOF
    
    log_warning "Template created at $INSTALL_PATH/.env.template"
    log_info "Please copy to $INSTALL_PATH/.env and update with your database credentials"
    log_info "Then run: sudo systemctl start $TIMER_NAME.timer"
else
    log_success ".env file found"
fi

# Step 6: Verify PostgreSQL client tools
log_info "Step 6: Verifying PostgreSQL client tools..."
if ! command -v pg_dump &> /dev/null; then
    log_error "pg_dump not found. Install with: sudo apt-get install postgresql-client"
    exit 1
fi

if ! command -v psql &> /dev/null; then
    log_error "psql not found. Install with: sudo apt-get install postgresql-client"
    exit 1
fi

log_success "PostgreSQL client tools verified"

# Step 7: Set permissions
log_info "Step 7: Setting proper permissions..."
chmod 700 "$BACKUPS_PATH"
chmod 755 "$SCRIPTS_PATH"
chmod 755 "$SCRIPTS_PATH/backup-database.sh"
log_success "Permissions set correctly"

# Summary
echo ""
log_info "========================================="
log_success "Setup Complete!"
log_info "========================================="
echo ""
log_info "What's been configured:"
log_info "• Backup scripts installed to: $SCRIPTS_PATH"
log_info "• Backup storage location: $BACKUPS_PATH"
log_info "• Systemd service: $SERVICE_NAME"
log_info "• Systemd timer: $TIMER_NAME (scheduled for 2:00 AM daily)"
echo ""

log_info "Next steps:"
log_info "1. Configure database credentials:"
echo "   sudo nano $INSTALL_PATH/.env"
echo ""
log_info "2. Test the backup script:"
echo "   sudo systemctl start $SERVICE_NAME"
echo ""
log_info "3. Check backup status:"
echo "   sudo journalctl -u $SERVICE_NAME -n 50"
echo ""
log_info "4. View backed up files:"
echo "   ls -lh $BACKUPS_PATH"
echo ""
log_info "5. Optional: Start the timer immediately:"
echo "   sudo systemctl start $TIMER_NAME.timer"
echo ""

log_info "For more information, see: BACKUP_GUIDE.md"
echo ""
