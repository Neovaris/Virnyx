# HTTPS & Nginx Reverse Proxy Setup Guide

This guide explains how to set up HTTPS with Nginx reverse proxy for Virnyx.

## Overview

The setup includes:
- **Nginx reverse proxy** - routes traffic to backend and admin services
- **SSL/TLS encryption** - HTTPS with configurable certificates
- **Security headers** - HSTS, CSP, X-Frame-Options, etc.
- **HTTP to HTTPS redirect** - all traffic encrypted
- **Self-signed certificates** - for development
- **Let's Encrypt** - free auto-renewing certificates for production

## Quick Start

### Development Setup (Self-Signed)

```bash
# Generate self-signed certificate (365 days)
chmod +x scripts/setup-ssl.sh
./scripts/setup-ssl.sh dev

# Start Nginx with Docker Compose
docker-compose up -d nginx

# Access via HTTPS
# https://virnyx.local (accept self-signed warning in browser)
```

### Production Setup (Let's Encrypt)

```bash
# Generate Let's Encrypt certificate
./scripts/setup-ssl.sh prod example.com admin@example.com

# Start full stack with production compose file
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Certificate auto-renews every 12 hours
```

## Certificate Management

### Generate Development Certificate

```bash
# Default: virnyx.local, valid for 365 days
./scripts/setup-ssl.sh dev

# Custom domain and expiry
DOMAIN=myapp.local CERT_DAYS=730 ./scripts/setup-ssl.sh dev

# View certificate details
./scripts/setup-ssl.sh view
```

**What it does:**
- Creates `nginx/ssl/key.pem` (private key)
- Creates `nginx/ssl/cert.pem` (certificate)
- Marks files with restricted permissions

**Browser Setup:**
1. Accept the certificate warning on first visit
2. Or import `nginx/ssl/cert.pem` into system keystore
3. Or use `curl -k` to bypass verification

### Setup Production Certificate (Let's Encrypt)

```bash
# Interactive setup
./scripts/setup-ssl.sh prod example.com admin@example.com

# Prerequisites:
# - Domain name points to your server
# - Port 80 accessible from internet
# - Email for renewal notifications
```

**What it does:**
1. Creates temporary self-signed certificate
2. Validates domain ownership via HTTP challenge
3. Installs certificate from Let's Encrypt
4. Copies to `nginx/ssl/` for Nginx to use

**Automatic Renewal:**
- Docker container runs certbot renewal every 12 hours
- Failed renewals are retried
- Renewal logs available via: `docker logs virnyx_certbot`

### Renew Certificate Manually

```bash
# Renew and update Nginx
./scripts/setup-ssl.sh renew

# Or via Docker
docker-compose exec certbot certbot renew
```

## Nginx Configuration

### File Structure

```
backend/
├── nginx/
│   ├── nginx.conf          # Main Nginx configuration
│   ├── ssl/
│   │   ├── cert.pem        # SSL certificate (generated)
│   │   └── key.pem         # Private key (generated)
│   └── certbot/            # Certbot challenge directory
└── docker-compose.prod.yml
```

### Configuration Features

**Main features in [nginx.conf](../nginx/nginx.conf):**

1. **HTTP to HTTPS Redirect**
   - All HTTP traffic (port 80) redirects to HTTPS
   - Allows certbot validation via `/.well-known/acme-challenge/`

2. **SSL Configuration**
   - TLS 1.2 and 1.3 only
   - Modern cipher suites
   - Session caching and resumption
   - OCSP stapling ready

3. **Security Headers**
   ```
   - Strict-Transport-Security (HSTS): Force HTTPS for 2 years
   - X-Frame-Options: Prevent clickjacking
   - X-Content-Type-Options: Prevent MIME sniffing
   - X-XSS-Protection: Enable XSS filter
   - Content-Security-Policy: Restrict resource loading
   - Referrer-Policy: Control referrer information
   ```

4. **Reverse Proxy Routes**
   - `/api/*` → Backend (Express, port 3000)
   - `/admin/*` → Admin Panel (Next.js, port 3001)
   - `/health` → Health check endpoint

5. **Performance Optimizations**
   - HTTP/2 support
   - Connection pooling to upstream servers
   - Request buffering
   - Gzip compression (if enabled upstream)

6. **Admin-Only Server (Port 8443)**
   - Restricted to localhost and Docker network
   - For internal management operations
   - Extra security headers

### Customizing nginx.conf

**Change domain name:**
```nginx
server_name example.com www.example.com;
```

**Adjust timeout values:**
```nginx
proxy_connect_timeout 120s;    # Connection timeout
proxy_read_timeout 120s;       # Read timeout
proxy_send_timeout 120s;       # Send timeout
```

**Modify security headers:**
```nginx
# Less restrictive CSP for development
add_header Content-Security-Policy "default-src 'self' 'unsafe-inline';" always;
```

**Enable/disable HTTP/2:**
```nginx
# Remove http2 for HTTP/1.1 only
listen 443 ssl;
```

## Docker Compose Configuration

### Development (docker-compose.yml)

Uses self-signed certificates:
```yaml
services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
```

**Start development environment:**
```bash
docker-compose up -d nginx backend postgres
```

### Production (docker-compose.prod.yml)

Includes certbot and automatic renewal:
```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

**What it starts:**
- Nginx reverse proxy (ports 80, 443, 8443)
- Certbot auto-renewal (background process)
- PostgreSQL database (with backup volume)
- Backend Express server
- Admin Next.js panel

**Key settings:**
```yaml
environment:
  - CERTBOT_EMAIL=admin@example.com  # For renewal notifications
  - NODE_ENV=production
  - NEXT_PUBLIC_API_URL=https://example.com/api
```

**Health checks:**
```bash
# Check Nginx status
curl -k https://localhost/health

# Check backend
curl -k https://localhost/api/health

# Check admin
curl -k https://localhost/admin
```

## Testing & Validation

### Test HTTPS Connection

```bash
# With certificate verification (production)
curl https://example.com/api/health

# Ignore self-signed cert warning (development)
curl -k https://localhost/api/health

# Show certificate details
curl -k --cacert nginx/ssl/cert.pem https://localhost/api/health

# Full verbosity
curl -kv https://localhost/api/health
```

### Check SSL Configuration

```bash
# Test SSL strength (requires testssl.sh)
./testssl.sh https://example.com

# Or use SSL Labs online
# https://www.ssllabs.com/ssltest/

# Check certificate expiry
openssl x509 -in nginx/ssl/cert.pem -noout -dates

# View full certificate
openssl x509 -in nginx/ssl/cert.pem -text -noout
```

### Monitor Nginx

```bash
# View logs
docker logs -f virnyx_nginx

# Or directly
tail -f nginx_logs:/var/log/nginx/access.log
tail -f nginx_logs:/var/log/nginx/error.log

# Check configuration syntax
docker exec virnyx_nginx nginx -t
```

### Monitor Certbot

```bash
# Check renewal status
sudo certbot certificates

# View renewal logs
docker logs -f virnyx_certbot

# Manual renewal test
sudo certbot renew --dry-run
```

## Troubleshooting

### Certificate Not Loading

**Symptoms:** "SSL_ERROR_NO_CYPHER_OVERLAP", certificate not found

**Solutions:**
```bash
# Verify certificate files exist
ls -la nginx/ssl/

# Verify certificate is valid
openssl x509 -in nginx/ssl/cert.pem -noout -text

# Reload Nginx
docker-compose exec nginx nginx -s reload

# Recreate certificate
./scripts/setup-ssl.sh dev
docker-compose up -d nginx
```

### Mixed Content Warnings

**Symptoms:** Browser warns about blocking http:// resources

**Solution:** Update CSP and ensure all resources use https://
```nginx
add_header Content-Security-Policy "upgrade-insecure-requests;" always;
```

### Certbot Renewal Failed

**Symptoms:** Certificate expired, renewal didn't work

**Check logs:**
```bash
docker logs virnyx_certbot

# Or system logs
sudo tail -30 /var/log/letsencrypt/letsencrypt.log
```

**Manual renewal:**
```bash
sudo certbot renew --force-renewal
```

### Nginx Won't Start

**Check configuration:**
```bash
docker-compose up nginx 2>&1 | grep error

# Or check inline
docker run --rm -v $(pwd)/nginx/nginx.conf:/etc/nginx/nginx.conf nginx nginx -t
```

### Domain Resolution Issues

**Ensure domain points to server:**
```bash
# Check DNS
nslookup example.com
dig example.com

# Test connectivity
ping example.com
curl -v https://example.com
```

## Security Best Practices

1. **Keep Certificates Updated**
   - Let's Encrypt renewal: automated via Docker
   - Self-signed: regenerate before expiry
   - Monitor expiry: `openssl x509 -dates`

2. **Restrict Admin Access**
   - Admin panel (port 8443) limited to internal network
   - Use strong authentication on `/admin/*` routes
   - Monitor access logs for suspicious activity

3. **Security Headers**
   - Review CSP policy regularly
   - Add X-Content-Type-Options to prevent MIME sniffing
   - Use Strict-Transport-Security to force HTTPS

4. **Rate Limiting**
   - Backend implements `/api/` rate limiting
   - Nginx can add additional limits if needed
   - Monitor DDoS patterns

5. **Regular Testing**
   - Test SSL configuration monthly: `testssl.sh`
   - Verify certificate validity
   - Check header presence: `curl -kI https://localhost`
   - Load test: `ab -r -t 60 -c 10 https://localhost/`

6. **Backups**
   - Back up certificate files (if self-hosted)
   - Keep `.env` with certbot email secure
   - Document renewal procedures

## Advanced: Custom Certificate

### Using Your Own Certificate

If you have an existing certificate:

```bash
# Copy your certificate
cp /path/to/your/cert.pem nginx/ssl/cert.pem
cp /path/to/your/key.pem nginx/ssl/key.pem

# Set permissions
chmod 600 nginx/ssl/key.pem
chmod 644 nginx/ssl/cert.pem

# Restart Nginx
docker-compose restart nginx
```

### Certificate Chain Issues

If your certificate has a chain:
```bash
# Combine full chain
cat /path/to/cert.pem /path/to/chain.pem > nginx/ssl/cert.pem
```

## References

- [Nginx Documentation](https://nginx.org/en/docs/)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [Mozilla SSL Configuration Generator](https://ssl-config.mozilla.org/)
- [OWASP Security Headers](https://owasp.org/www-project-secure-headers/)
- [CSP Documentation](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
