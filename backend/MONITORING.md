# Monitoring & Alerting Setup Guide

Complete production monitoring for Virnyx using Prometheus, Grafana, AlertManager, and custom webhooks.

## Overview

The monitoring stack provides:
- **Prometheus**: Metrics collection and storage (all systems, apps, DB)
- **Grafana**: Beautiful dashboards and visualization
- **AlertManager**: Alert routing and grouping
- **Webhook Handler**: Custom Discord + email notifications
- **Loki**: Log aggregation (optional)

## Quick Start

### 1. Set Environment Variables

Create or update your `.env` file:

```env
# Discord Alerts
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/your/webhook/url

# Email Configuration
ALERT_EMAIL=your-email@example.com
ALERT_FROM=alerts@virnyx.local
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Grafana
GRAFANA_PASSWORD=secure-password-here
```

**Get Discord Webhook URL:**
1. Go to Discord server settings → Integrations → Webhooks
2. Create new webhook, copy URL
3. Add to `.env` as `DISCORD_WEBHOOK_URL`

**Gmail App Password:**
1. Enable 2-factor authentication
2. Go to myaccount.google.com/apppasswords
3. Select Mail and Windows Computer
4. Copy password to `.env` as `SMTP_PASSWORD`

### 2. Start Monitoring Stack

```bash
# Start all monitoring services
docker-compose -f docker-compose.yml -f docker-compose.monitoring.yml up -d

# Verify services are running
docker-compose ps

# Check the webhook is working
curl http://localhost:5001/health
```

### 3. Access Grafana Dashboard

- **URL**: http://localhost:3002
- **Username**: admin
- **Password**: (from `GRAFANA_PASSWORD` in .env)

Default dashboard: "Virnyx System Overview"

### 4. Check Prometheus

- **URL**: http://localhost:9090
- **Status**: http://localhost:9090/targets
- **Alerts**: http://localhost:9090/alerts

### 5. Monitor AlertManager

- **URL**: http://localhost:9093
- **Check Routing**: http://localhost:9093/#/status

## Dashboard Tour

### Virnyx System Overview

**Top Row (System Health):**
- Backend Status - is API running?
- CPU Usage % - real-time CPU
- Memory Usage % - RAM consumption
- Disk Space % - storage remaining

**Middle (Application):**
- Request Rate - requests/second
- HTTP Error Rate - 5xx errors
- Response Time (p95) - slow requests

**Bottom (Database):**
- PostgreSQL Connections - active DB connections
- Cache Hit Ratio - database performance
- Container Status - running containers count
- Critical Alerts - firing critical alerts

**Colors & Thresholds:**
- 🟢 Green: Healthy
- 🟡 Yellow: Warning (80%+)
- 🔴 Red: Critical (>80%)

## Alert Rules

### Severity Levels

**Critical** (immediate action):
- Service down (backend, database, nginx, monitoring)
- Disk critical (<5%)
- Network interface down

**Warning** (investigate soon):
- High CPU/Memory (>80%)
- Disk low (<15%)
- High error rate (>10%)
- Slow response times (p95 > 1s)

**Info** (informational only):
- Low cache hit ratio
- Slow queries detected

### Alert Rule Examples

```yaml
# Backend response time too high
BackendLatencyHigh:
  condition: p95 latency > 1 second for 5 minutes
  severity: warning
  action: Check backend logs, increase resources

# Database connections maxed out
PostgresConnectionsHigh:
  condition: active connections > 80 for 5 minutes
  severity: warning
  action: Close idle connections, increase pool size

# Disk almost full
DiskSpaceCritical:
  condition: available disk < 5% for 2 minutes
  severity: critical
  action: Delete old data, expand storage
```

## Alert Channels

### Discord Integration

Alerts appear as embeds in Discord:

```
🚨 CRITICAL - Virnyx Alert
✓ Backend service is down
  Status: Firing
  Summary: Backend service at backend:3000 is not responding
```

**Features:**
- Color-coded by severity (🔴 critical, 🟠 warning, 🔵 info)
- Up to 10 alerts per message
- Grouped and deduplicated
- Links to Grafana/Prometheus

### Email Notifications

HTML emails sent for critical and warning alerts:

```
Subject: [CRITICAL] BackendDown

Header (red background): 🚨 Critical Alert
- Alert name
- Service
- Status (Firing/Resolved)
- Summary
- Description

Footer: Links to Grafana and Prometheus
```

### Routing Rules

**Critical → Immediate Discord + Email**
- Backend/Database down
- Disk critical
- Monitoring down

**Warning → Batched Discord + Email**
- High resource usage
- Error rates
- Performance issues

**Info → Dashboard only**
- Slow queries
- Cache issues
- Informational metrics

## Customizing Alerts

### Adding New Alert

1. Edit `monitoring/alert-rules.yml`:

```yaml
- alert: MyCustomAlert
  expr: some_metric > threshold
  for: 5m
  labels:
    severity: warning
    service: myservice
  annotations:
    summary: "Human-readable summary"
    description: "{{ $value }} - detailed info"
```

2. Reload Prometheus:

```bash
curl -X POST http://localhost:9090/-/reload
```

3. Check alert in Prometheus UI

### Adjusting Thresholds

Edit alert-rules.yml:

```yaml
# Current: CPU > 80%
expr: cpu_usage > 80

# More sensitive: CPU > 70%
expr: cpu_usage > 70

# Less sensitive: CPU > 90%
expr: cpu_usage > 90
```

## Monitoring Backends

### System Metrics (Node Exporter)

- CPU usage and cores
- Memory (used, free, buffers)
- Disk I/O and space
- Network interfaces
- Process metrics

**Query examples:**
```promql
# CPU usage percentage
(100 - (avg(irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100))

# Memory available
node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes

# Disk free
(node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"}) * 100
```

### Application Metrics (Backend)

Custom metrics exposed at `/metrics`:

```promql
# HTTP request rate
rate(http_requests_total[5m])

# Error rate
rate(http_requests_total{status=~"5.."}[5m])

# Response time latency
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
```

### Container Metrics (cAdvisor)

- Container CPU/memory usage
- Network I/O
- File system usage
- Restart count

### Database Metrics (PostgreSQL Exporter)

- Active connections
- Queries per second
- Cache hit ratio
- Database size
- Index usage
- Slow queries

**Add PostgreSQL to docker-compose:**

```yaml
postgres-exporter:
  image: prometheuscommunity/postgres-exporter
  environment:
    DATA_SOURCE_NAME: postgresql://user:pass@postgres:5432/virnyx
  ports:
    - "9187:9187"
  networks:
    - virnyx_network
```

## Troubleshooting

### Alerts Not Firing

1. **Check Prometheus:**
   ```
   http://localhost:9090/alerts
   ```

2. **Verify rule syntax:**
   ```bash
   docker-compose exec prometheus promtool check rules /etc/prometheus/alert-rules.yml
   ```

3. **Check metric exists:**
   ```
   http://localhost:9090/graph
   # Enter metric name, e.g., http_requests_total
   ```

4. **Reload rules:**
   ```bash
   curl -X POST http://localhost:9090/-/reload
   ```

### Notifications Not Received

**Discord webhook failing:**
```bash
# Test webhook
curl -X POST https://discord.com/api/webhooks/YOUR/WEBHOOK \
  -H "Content-Type: application/json" \
  -d '{"content":"Test"}'

# Check webhook logs
docker logs virnyx_alertmanager_webhook
```

**Email not sending:**
```bash
# Verify SMTP credentials
docker exec virnyx_alertmanager_webhook node -e "
const mailer = require('nodemailer');
const m = mailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
});
m.verify(console.log);
"
```

### High Memory Usage

Prometheus stores all metrics for 30 days. To reduce:

```yaml
# In docker-compose.monitoring.yml, decrease retention:
command:
  - '--storage.tsdb.retention.time=7d'  # was 30d
```

### Dashboard Empty

1. **Check datasource:**
   - Grafana → Configuration → Data Sources
   - Should show "Prometheus" as default

2. **Verify scrape jobs:**
   ```
   http://localhost:9090/targets
   ```
   All should show "UP" in green

3. **Check metric names:**
   ```
   http://localhost:9090/graph
   # Type: http_requests_total (or similar)
   ```

## Performance Tuning

### Reduce Scrape Frequency

For less critical services:

```yaml
scrape_configs:
  - job_name: 'admin-panel'
    scrape_interval: 30s  # was 10s
```

### Increase Storage

For longer retention:

```bash
# In docker-compose.monitoring.yml
volumes:
  - prometheus_data:/prometheus
# Add more storage to host machine
```

### Filter Metrics

In `prometheus.yml`, keep only needed metrics:

```yaml
metric_relabel_configs:
  - source_labels: [__name__]
    regex: 'http_(requests|errors|duration).*'
    action: keep
```

## Production Checklist

- [ ] Discord webhook configured and tested
- [ ] Email SMTP credentials working
- [ ] Grafana password changed from default
- [ ] Alert rules reviewed and adjusted
- [ ] Backup external alerting configured (for monitoring-down scenarios)
- [ ] logs/metrics volumes have sufficient disk space
- [ ] Remove admin password from docker logs
- [ ] Test alert routing (critical, warning, info)
- [ ] Configure Prometheus retention policy
- [ ] Set up Loki log aggregation
- [ ] Add additional custom alerts
- [ ] Document on-call runbooks for each alert
- [ ] Schedule alerting drills monthly

## Advanced: Custom Metrics

### Add Backend Metrics

In `src/middlewares/metrics.ts`:

```typescript
import { register, Counter, Histogram } from 'prom-client';

const httpRequests = new Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'path', 'status'],
});

const httpDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration',
  labelNames: ['method', 'path', 'status'],
});

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    httpRequests.inc({ method: req.method, path: req.path, status: res.statusCode });
    httpDuration.observe({ method: req.method, path: req.path, status: res.statusCode }, (Date.now() - start) / 1000);
  });
  next();
});

app.get('/metrics', (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(register.metrics());
});
```

### Add Database Metrics

```typescript
const dbQueryTime = new Histogram({
  name: 'db_query_duration_seconds',
  help: 'Database query duration',
  labelNames: ['operation', 'table'],
});

prisma.$use(async (params, next) => {
  const start = Date.now();
  const result = await next(params);
  const duration = (Date.now() - start) / 1000;
  dbQueryTime.observe({ operation: params.action, table: params.model }, duration);
  return result;
});
```

## References

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [AlertManager Documentation](https://prometheus.io/docs/alerting/latest/overview/)
- [Prometheus Query Language](https://prometheus.io/docs/prometheus/latest/querying/basics/)
- [Alert Best Practices](https://docs.google.com/document/d/199PqyG3UsyXlwieHaqbGiWVa8eMWi8OwflsEP0eYA3U/)
