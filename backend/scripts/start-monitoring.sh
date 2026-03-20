#!/bin/bash

# Virnyx Monitoring Stack Quick Start
# Sets up Prometheus, Grafana, AlertManager with Discord/Email alerts

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

echo ""
log_info "====================================="
log_info "Virnyx Monitoring Stack Setup"
log_info "====================================="
echo ""

# Check if .env exists
if [ ! -f ".env" ]; then
    log_warning "No .env file found"
    echo ""
    log_info "Creating .env from example..."
    
    cat > .env << 'EOF'
# Database
DB_HOST=postgres
DB_PORT=5432
DB_USER=virnyx
DB_PASSWORD=virnyxpass
DB_NAME=virnyx

# Monitoring
GRAFANA_PASSWORD=admin

# Discord Webhook (get from Discord → Server Settings → Integrations)
# DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR/WEBHOOK

# Email Configuration (optional)
# ALERT_EMAIL=your-email@example.com
# ALERT_FROM=alerts@virnyx.local
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your-email@gmail.com
# SMTP_PASSWORD=your-app-password
EOF
    
    log_success ".env created"
    log_warning "Please update .env with your configuration"
    echo ""
fi

# Validate required variables
log_info "Validating configuration..."

check_var() {
    local var_name=$1
    local var_value=${!var_name}
    
    if [ -z "$var_value" ]; then
        log_warning "  $var_name: not set (optional)"
        return 1
    else
        log_success "  $var_name: ✓"
        return 0
    fi
}

# Source .env
export $(cat .env | grep -v '#' | xargs)

# Check critical vars
log_info "Checking critical configuration:"
check_var "DB_HOST" || true
check_var "DB_USER" || true

# Check optional vars
log_info "Checking optional configuration:"
check_var "DISCORD_WEBHOOK_URL" || false
check_var "ALERT_EMAIL" || false

echo ""
log_info "Creating directories..."
mkdir -p monitoring/grafana/provisioning/datasources
mkdir -p monitoring/grafana/provisioning/dashboards
mkdir -p monitoring/grafana/dashboards
log_success "Directories created"

# Check Docker
log_info "Checking Docker installation..."
if ! command -v docker &> /dev/null; then
    log_error "Docker not found. Install from: https://docs.docker.com/get-docker/"
    exit 1
fi
log_success "Docker found: $(docker --version)"

if ! command -v docker-compose &> /dev/null; then
    log_error "Docker Compose not found. Install from: https://docs.docker.com/compose/install/"
    exit 1
fi
log_success "Docker Compose found: $(docker-compose --version)"

echo ""
log_info "Starting monitoring stack..."

# Check if running
RUNNING=$(docker-compose ps -q prometheus 2>/dev/null || echo "")
if [ ! -z "$RUNNING" ]; then
    log_warning "Monitoring services already running"
    read -p "Restart? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        docker-compose -f docker-compose.yml -f docker-compose.monitoring.yml down
    else
        exit 0
    fi
fi

# Start services
docker-compose -f docker-compose.yml -f docker-compose.monitoring.yml up -d

echo ""
log_info "Waiting for services to start..."
sleep 5

# Verify services
log_info "Verifying services..."

services_to_check=(
  "prometheus:9090"
  "grafana:3000"
  "alertmanager:9093"
  "alertmanager-webhook:5001"
)

for service in "${services_to_check[@]}"; do
  IFS=':' read -r name port <<< "$service"
  
  if curl -s "http://localhost:$port/health" > /dev/null 2>&1 || \
     curl -s "http://localhost:$port" > /dev/null 2>&1; then
    log_success "$name is running"
  else
    log_warning "$name might still be starting..."
  fi
done

echo ""
log_success "====================================="
log_success "Monitoring Stack Started!"
log_success "====================================="
echo ""
log_info "Access URLs:"
echo ""
echo "  📊 Grafana:        http://localhost:3002"
echo "     Username: admin"
echo "     Password: $(grep GRAFANA_PASSWORD .env | cut -d'=' -f2)"
echo ""
echo "  📈 Prometheus:     http://localhost:9090"
echo "     Targets:  http://localhost:9090/targets"
echo "     Alerts:   http://localhost:9090/alerts"
echo ""
echo "  🔔 AlertManager:   http://localhost:9093"
echo "     Status:   http://localhost:9093/#/status"
echo ""
echo "  🪝 Webhook:        http://localhost:5001/health"
echo ""

log_info "Next steps:"
echo ""
echo "  1. Open Grafana: http://localhost:3002"
echo "  2. Login with admin / $(grep GRAFANA_PASSWORD .env | cut -d'=' -f2)"
echo "  3. View 'Virnyx System Overview' dashboard"
echo "  4. Check Prometheus targets: http://localhost:9090/targets"
echo ""

if [ -z "$DISCORD_WEBHOOK_URL" ]; then
    log_warning "Discord webhook not configured!"
    echo ""
    echo "  To enable Discord alerts:"
    echo "  1. Edit .env file"
    echo "  2. Add: DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR/WEBHOOK"
    echo ""
fi

if [ -z "$ALERT_EMAIL" ]; then
    log_warning "Email alerts not configured!"
    echo ""
    echo "  To enable email alerts:"
    echo "  1. Edit .env file"
    echo "  2. Add SMTP configuration (see .env.example)"
    echo "  3. Restart: docker-compose restart alertmanager-webhook"
    echo ""
fi

log_info "For more info: cat MONITORING.md"
echo ""
