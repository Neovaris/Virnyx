#!/bin/bash

# SSL Certificate Setup for Virnyx
# Sets up both self-signed (development) and Let's Encrypt (production) certificates

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

# Parse arguments
CERT_TYPE="${1:-help}"
DOMAIN="${2:-virnyx.local}"
EMAIL="${3:-admin@example.com}"

show_help() {
    cat << EOF
${BLUE}Virnyx SSL Certificate Setup${NC}

Usage: ./setup-ssl.sh [TYPE] [OPTIONS]

Types:
  ${GREEN}dev${NC}          Create self-signed certificate for development
  ${GREEN}prod${NC}         Set up Let's Encrypt for production
  ${GREEN}renew${NC}        Renew Let's Encrypt certificate
  ${GREEN}help${NC}         Show this help message

Examples:

  # Development (self-signed):
  ./setup-ssl.sh dev

  # Production (Let's Encrypt):
  ./setup-ssl.sh prod example.com admin@example.com

  # Renew certificate:
  ./setup-ssl.sh renew

Environment Variables:
  CERT_DAYS        Days until certificate expires (dev only, default: 365)
  DOMAIN           Domain name for certificate (default: virnyx.local)
  EMAIL            Email for Let's Encrypt notifications (default: admin@example.com)

EOF
}

setup_dev_certificate() {
    local domain="$1"
    local days="${CERT_DAYS:-365}"
    
    log_info "Creating self-signed SSL certificate for development..."
    log_info "Domain: $domain"
    log_info "Valid for: $days days"
    
    # Create ssl directory
    mkdir -p nginx/ssl
    
    # Check if certificate already exists
    if [ -f "nginx/ssl/cert.pem" ] && [ -f "nginx/ssl/key.pem" ]; then
        log_warning "Certificate already exists at nginx/ssl/cert.pem"
        read -p "Overwrite? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "Skipping certificate generation"
            return 0
        fi
    fi
    
    # Generate private key
    log_info "Generating private key..."
    openssl genrsa -out nginx/ssl/key.pem 2048
    
    # Generate certificate (one command with all details)
    log_info "Generating certificate..."
    openssl req -new -x509 \
        -key nginx/ssl/key.pem \
        -out nginx/ssl/cert.pem \
        -days "$days" \
        -subj "/C=US/ST=State/L=City/O=Organization/CN=$domain"
    
    # Set proper permissions
    chmod 600 nginx/ssl/key.pem
    chmod 644 nginx/ssl/cert.pem
    
    log_success "Self-signed certificate created!"
    log_info "Certificate path: nginx/ssl/cert.pem"
    log_info "Key path: nginx/ssl/key.pem"
    log_info ""
    log_info "Certificate expires in $days days"
    log_info "To use in development, add to your browser's trusted certificates"
    
    # Show certificate details
    log_info "Certificate details:"
    openssl x509 -in nginx/ssl/cert.pem -text -noout | grep -A2 "Subject:\|Issuer:\|Not Before\|Not After"
}

setup_prod_certificate() {
    local domain="$1"
    local email="$2"
    
    log_info "Setting up Let's Encrypt SSL certificate for production..."
    log_info "Domain: $domain"
    log_info "Email: $email"
    
    # Check if certbot is installed
    if ! command -v certbot &> /dev/null; then
        log_error "certbot is not installed"
        log_info "Install it with:"
        log_info "  Ubuntu/Debian: sudo apt-get install certbot"
        log_info "  macOS: brew install certbot"
        exit 1
    fi
    
    # Create directories
    mkdir -p nginx/ssl
    mkdir -p nginx/certbot
    
    # Create initial self-signed (placeholder)
    if [ ! -f "nginx/ssl/cert.pem" ] || [ ! -f "nginx/ssl/key.pem" ]; then
        log_info "Creating temporary self-signed certificate..."
        openssl req -x509 -newkey rsa:2048 \
            -keyout nginx/ssl/key.pem \
            -out nginx/ssl/cert.pem \
            -days 1 -nodes \
            -subj "/C=US/ST=State/L=City/O=Organization/CN=$domain"
        chmod 600 nginx/ssl/key.pem
    fi
    
    # Obtain certificate using standalone mode (requires port 80 to be open)
    log_info "Requesting certificate from Let's Encrypt..."
    log_warning "Make sure port 80 is accessible before continuing"
    read -p "Continue? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Skipped certificate request"
        return 1
    fi
    
    # Use certbot with webroot or standalone
    log_info "Obtaining certificate..."
    sudo certbot certonly \
        --standalone \
        --agree-tos \
        --no-eff-email \
        --email "$email" \
        -d "$domain"
    
    # Copy certificates to nginx directory
    log_info "Copying certificates to nginx directory..."
    sudo cp "/etc/letsencrypt/live/$domain/fullchain.pem" "nginx/ssl/cert.pem"
    sudo cp "/etc/letsencrypt/live/$domain/privkey.pem" "nginx/ssl/key.pem"
    sudo chown "$USER:$USER" "nginx/ssl/cert.pem" "nginx/ssl/key.pem"
    chmod 600 "nginx/ssl/key.pem"
    
    log_success "Let's Encrypt certificate installed!"
    log_info "Certificate path: nginx/ssl/cert.pem"
    log_info "Key path: nginx/ssl/key.pem"
    log_info ""
    log_info "Certificate will auto-renew every 12 hours (via Docker container)"
    
    # Show certificate details
    log_info "Certificate details:"
    openssl x509 -in "nginx/ssl/cert.pem" -text -noout | grep -A2 "Subject:\|Issuer:\|Not Before\|Not After"
}

renew_certificate() {
    log_info "Renewing Let's Encrypt certificate..."
    
    if ! command -v certbot &> /dev/null; then
        log_error "certbot is not installed"
        exit 1
    fi
    
    log_info "Running certbot renew..."
    sudo certbot renew --quiet
    
    # Find the first certificate and copy it
    local first_cert=$(sudo ls -t /etc/letsencrypt/live/*/cert.pem 2>/dev/null | head -1)
    if [ -z "$first_cert" ]; then
        log_error "No Let's Encrypt certificates found"
        exit 1
    fi
    
    local domain=$(basename "$(dirname "$first_cert")")
    log_info "Updating certificate from: $domain"
    
    sudo cp "/etc/letsencrypt/live/$domain/fullchain.pem" "nginx/ssl/cert.pem"
    sudo cp "/etc/letsencrypt/live/$domain/privkey.pem" "nginx/ssl/key.pem"
    sudo chown "$USER:$USER" "nginx/ssl/cert.pem" "nginx/ssl/key.pem"
    
    log_success "Certificate renewed and copied!"
}

view_certificate() {
    if [ ! -f "nginx/ssl/cert.pem" ]; then
        log_error "Certificate not found at nginx/ssl/cert.pem"
        return 1
    fi
    
    log_info "Certificate details:"
    echo ""
    openssl x509 -in nginx/ssl/cert.pem -text -noout
}

# Main script logic
case "$CERT_TYPE" in
    dev)
        setup_dev_certificate "$DOMAIN"
        ;;
    prod)
        setup_prod_certificate "$DOMAIN" "$EMAIL"
        ;;
    renew)
        renew_certificate
        ;;
    view)
        view_certificate
        ;;
    help|-h|--help)
        show_help
        ;;
    *)
        log_error "Unknown command: $CERT_TYPE"
        echo ""
        show_help
        exit 1
        ;;
esac
