#!/bin/bash
set -e

# Update system
yum update -y
yum install -y docker git curl wget postgresql15

# Start Docker
systemctl start docker
systemctl enable docker

# Add ec2-user to docker group
usermod -aG docker ec2-user

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Create application directory
mkdir -p /opt/virnyx
cd /opt/virnyx

# Clone the repository (you'll need to configure this)
# git clone https://github.com/Neovaris/Virnyx.git .
# For now, we'll create placeholder files - you should automate this via GitHub

# Create .env file for production
cat > /opt/virnyx/.env << EOF
# Database Configuration
DATABASE_URL="postgresql://${db_username}:${db_password}@${db_host}:${db_port}/${db_name}?schema=public"
JWT_SECRET=$(openssl rand -base64 32)

# Admin Panel
NEXT_PUBLIC_API_BASE_URL="http://$(wget -q -O - http://169.254.169.254/latest/meta-data/public-ipv4):4000"
BACKEND_URL="http://localhost:4000"

# Email Configuration
DISCORD_WEBHOOK_URL=""
ALERT_EMAIL="alerts@virnyx.local"
ALERT_FROM="virnyx@neovaristechnologies.com"
SMTP_HOST="smtppro.zoho.com"
SMTP_PORT="587"
SMTP_USER="your-email@example.com"
SMTP_PASSWORD="your-app-password"

# Grafana Configuration
GRAFANA_PASSWORD=$(openssl rand -base64 16)

# Environment
NODE_ENV="production"
EOF

# Create docker-compose.yml for production (simplified)
cat > /opt/virnyx/docker-compose.prod.yml << 'EOF'
version: '3.8'

services:
  backend:
    image: virnyx-backend:latest
    container_name: virnyx_backend
    ports:
      - "4000:4000"
    environment:
      DATABASE_URL: $DATABASE_URL
      JWT_SECRET: $JWT_SECRET
      NODE_ENV: production
    depends_on:
      - db
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:4000/"]
      interval: 30s
      timeout: 10s
      retries: 3

  admin:
    image: virnyx-admin:latest
    container_name: virnyx_admin
    ports:
      - "3000:3000"
    environment:
      NEXT_PUBLIC_API_BASE_URL: http://$(hostname -I | awk '{print $1}'):4000
      BACKEND_URL: http://backend:4000
      NODE_ENV: production
    depends_on:
      - backend
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/"]
      interval: 30s
      timeout: 10s
      retries: 3

  nginx:
    image: nginx:alpine
    container_name: virnyx_nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - backend
      - admin
    restart: unless-stopped

  prometheus:
    image: prom/prometheus:latest
    container_name: virnyx_prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml:ro
    restart: unless-stopped

  grafana:
    image: grafana/grafana:latest
    container_name: virnyx_grafana
    ports:
      - "3002:3000"
    environment:
      GF_SECURITY_ADMIN_PASSWORD: $GRAFANA_PASSWORD
    restart: unless-stopped

volumes:
  postgres_data:
EOF

# Set proper permissions
chmod 600 /opt/virnyx/.env
chown ec2-user:ec2-user /opt/virnyx -R

# Create CloudWatch agent configuration
cat > /opt/virnyx/cloudwatch-config.json << 'EOF'
{
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/var/log/docker",
            "log_group_name": "/virnyx/docker",
            "log_stream_name": "{instance_id}"
          }
        ]
      }
    }
  },
  "metrics": {
    "namespace": "Virnyx",
    "metrics_collected": {
      "cpu": {
        "measurement": [
          "cpu_usage_idle"
        ],
        "metrics_collection_interval": 60
      },
      "mem": {
        "measurement": [
          "mem_used_percent"
        ],
        "metrics_collection_interval": 60
      }
    }
  }
}
EOF

# Install CloudWatch agent
wget https://s3.amazonaws.com/amazoncloudwatch-agent/amazon_linux/amd64/latest/amazon-cloudwatch-agent.rpm
rpm -U ./amazon-cloudwatch-agent.rpm

# Create deployment script for user
cat > /opt/virnyx/deploy.sh << 'EOFSCRIPT'
#!/bin/bash
set -e

cd /opt/virnyx

# Pull latest code (when integrated with GitHub)
# git pull origin main

# Build Docker images
echo "Building Docker images..."
docker-compose -f docker-compose.prod.yml build

# Stop old containers
echo "Stopping old containers..."
docker-compose -f docker-compose.prod.yml down

# Run migrations
echo "Running database migrations..."
docker-compose -f docker-compose.prod.yml up -d db
sleep 10
docker-compose -f docker-compose.prod.yml exec -T backend npm run prisma:migrate:deploy

# Start all services
echo "Starting services..."
docker-compose -f docker-compose.prod.yml up -d

echo "Deployment complete!"
docker-compose -f docker-compose.prod.yml ps
EOFSCRIPT

chmod +x /opt/virnyx/deploy.sh

# Create log directory for Docker
mkdir -p /var/log/docker

# Signal successful completion
echo "EC2 instance initialization complete!"
echo "Application directory: /opt/virnyx"
echo "Environment file: /opt/virnyx/.env"
