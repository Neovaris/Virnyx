# Monitoring Integration Guide

Instructions for integrating Prometheus metrics into the Virnyx backend.

## 1. Install Dependencies

```bash
cd backend
npm install prom-client
```

## 2. Update Backend Server Setup

Add metrics middleware to your Express server:

### In `src/server.ts` or `src/app.ts`:

```typescript
import { metricsMiddleware, getMetrics, setupPrismaMetrics } from './middlewares/metrics';
import { prisma } from './db/client'; // Update path as needed

// Create Express app
const app = express();

// Add metrics middleware early in the chain
app.use(metricsMiddleware());

// ... other middleware ...

// Setup Prisma metrics tracking
setupPrismaMetrics(prisma);

// Expose metrics endpoint
app.get('/metrics', getMetrics);

// ... routes ...

export default app;
```

## 3. Track Business Metrics

### In your sales controller:

```typescript
import { salesTotal, salesAmount } from '../middlewares/metrics';

export async function createSale(req: Request, res: Response) {
  try {
    const sale = await saleSvc.create(req.body);
    
    // Track metrics
    salesTotal.inc({ status: 'success', merchant: sale.merchantId });
    salesAmount.inc({ merchant: sale.merchantId }, sale.totalAmount);
    
    res.json(sale);
  } catch (error) {
    salesTotal.inc({ status: 'failed', merchant: req.user.merchantId });
    throw error;
  }
}
```

### In your refunds controller:

```typescript
import { refundsTotal } from '../middlewares/metrics';

export async function createRefund(req: Request, res: Response) {
  const refund = await refundSvc.create(req.body);
  
  // Track reason for refunds
  refundsTotal.inc({ reason: refund.reason });
  
  res.json(refund);
}
```

### Track active sessions/users:

```typescript
import { activeUsers, activeSessions } from '../middlewares/metrics';

// On user login
activeUsers.inc();
activeSessions.inc();

// On user logout
activeUsers.dec();
activeSessions.dec();
```

## 4. Update Package.json

Ensure prom-client is in dependencies:

```json
{
  "dependencies": {
    "prom-client": "^15.0.0"
  }
}
```

And TypeScript types (if using TypeScript):

```json
{
  "devDependencies": {
    "@types/node": "^20.0.0"
  }
}
```

## 5. Test Metrics Endpoint

### Without Docker:

```bash
# Start backend
npm run dev

# In another terminal
curl http://localhost:3000/metrics
```

### With Docker:

```bash
# Start all services
docker-compose -f docker-compose.yml -f docker-compose.monitoring.yml up -d

# Check metrics
curl http://localhost:3000/metrics

# Or inside container
docker exec virnyx_backend curl http://localhost:3000/metrics
```

You should see output like:

```
# HELP http_requests_total Total HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",path="/api/users",status="200"} 150

# HELP http_request_duration_seconds HTTP request duration in seconds
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{method="GET", ... le="0.1"} 45
...
```

## 6. Verify in Prometheus

1. Open http://localhost:9090/targets
   - Should show backend job as "UP"

2. Query metrics in Prometheus:
   - http://localhost:9090/graph
   - Type: `http_requests_total` → Execute
   - Should see your requests

3. Check Grafana dashboard:
   - http://localhost:3002
   - View metrics in "Virnyx System Overview"

## 7. Custom Metrics

Add your own business metrics:

```typescript
import { Counter, Gauge } from 'prom-client';

export const inventoryLow = new Counter({
  name: 'inventory_low_alerts',
  help: 'Number of low inventory alerts',
  labelNames: ['product_id', 'merchant_id'],
});

export const orderProcessingTime = new Histogram({
  name: 'order_processing_time_seconds',
  help: 'Time to process order',
  labelNames: ['order_type'],
});

// Then use in your code:
inventoryLow.inc({ product_id: '123', merchant_id: 'merchant1' });
orderProcessingTime.observe({ order_type: 'sale' }, processingTime);
```

## 8. Monitor in Grafana

Add panels to track your business metrics:

1. Panel → Add Query
2. Datasource: Prometheus
3. Metric: `sales_total` or custom metric
4. Legend: `{{ status }}`
5. Save dashboard

Example queries:

```promql
# Sales per minute
rate(sales_total[1m])

# Refunds by reason
refunds_total by (reason)

# Average request latency
rate(http_request_duration_seconds_sum[5m]) / rate(http_request_duration_seconds_count[5m])

# Error rate percentage
rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) * 100
```

## Troubleshooting

### Metrics endpoint not found

- Ensure route is added: `app.get('/metrics', getMetrics)`
- Check if middleware is initialized: `import { metricsMiddleware } from './middlewares/metrics'`
- Restart backend after changes

### No metrics showing up

1. Make requests to backend (need data to record)
2. Check metrics endpoint: `curl http://localhost:3000/metrics`
3. Look for `http_` prefix in output
4. If empty, check if middleware is added to app

### High cardinality warning

If you see errors about "too many labels" or "high cardinality":

- Update `normalizePath()` to normalize more path patterns
- Use fewer label combinations
- Aggregate similar metrics

### Prometheus not scraping

1. Check Prometheus targets: http://localhost:9090/targets
2. Verify backend job shows "UP"
3. If "DOWN", check backend logs: `docker logs virnyx_backend`
4. Ensure `/metrics` endpoint is accessible
5. Check firewall/network

## Production Considerations

**1. Disable sensitive metrics:**
```typescript
// In metrics.ts
if (process.env.NODE_ENV === 'production') {
  // Don't expose user IDs or sensitive paths
  return ':id'; // Always normalize paths
}
```

**2. Rate limit metrics endpoint:**
```typescript
import rateLimit from '@fastify/rate-limit';

app.use('/metrics', rateLimit({
  max: 100,
  timeWindow: '15 minutes',
}));
```

**3. Require authentication:**
```typescript
app.get('/metrics', authMiddleware, getMetrics);
```

**4. Use private metrics scrape:**
```yaml
# In prometheus.yml - use internal network only
static_configs:
  - targets: ['backend:3000']  # Private network, not public IP
```

**5. Monitor Prometheus itself:**
```bash
# Check Prometheus memory usage
docker stats virnyx_prometheus
```
