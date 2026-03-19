/**
 * Prometheus Metrics Middleware
 * Exposes application metrics for monitoring
 * 
 * Tracks:
 * - HTTP request count and latency
 * - Error rates
 * - Database query performance
 * - Custom business metrics
 */

import { Request, Response, NextFunction } from 'express';
import {
  register,
  Counter,
  Histogram,
  Gauge,
  collectDefaultMetrics,
} from 'prom-client';

// Rename default metrics for clarity
collectDefaultMetrics({ prefix: 'app_' });

// ============================================
// HTTP Metrics
// ============================================

export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'path', 'status'],
});

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'path', 'status'],
  buckets: [0.001, 0.01, 0.05, 0.1, 0.5, 1, 2, 5],
});

export const httpRequestSize = new Histogram({
  name: 'http_request_size_bytes',
  help: 'HTTP request body size in bytes',
  labelNames: ['method', 'path'],
  buckets: [100, 1000, 5000, 10000, 50000, 100000, 500000],
});

export const httpResponseSize = new Histogram({
  name: 'http_response_size_bytes',
  help: 'HTTP response body size in bytes',
  labelNames: ['method', 'path', 'status'],
  buckets: [100, 1000, 5000, 10000, 50000, 100000, 500000],
});

// ============================================
// Business Metrics
// ============================================

export const salesTotal = new Counter({
  name: 'sales_total',
  help: 'Total sales transactions',
  labelNames: ['status', 'merchant'],
});

export const salesAmount = new Counter({
  name: 'sales_amount_total',
  help: 'Total sales amount in currency units',
  labelNames: ['merchant'],
});

export const refundsTotal = new Counter({
  name: 'refunds_total',
  help: 'Total refunds processed',
  labelNames: ['reason'],
});

export const activeUsers = new Gauge({
  name: 'active_users',
  help: 'Number of active users',
});

export const activeSessions = new Gauge({
  name: 'active_sessions',
  help: 'Number of active sessions',
});

// ============================================
// Database Metrics
// ============================================

export const dbQueryDuration = new Histogram({
  name: 'db_query_duration_seconds',
  help: 'Database query duration in seconds',
  labelNames: ['operation', 'table'],
  buckets: [0.001, 0.01, 0.05, 0.1, 0.5, 1, 2, 5],
});

export const dbConnections = new Gauge({
  name: 'db_connections_active',
  help: 'Number of active database connections',
});

export const dbErrors = new Counter({
  name: 'db_errors_total',
  help: 'Total database errors',
  labelNames: ['operation', 'table', 'error_type'],
});

// ============================================
// Middleware Functions
// ============================================

/**
 * Express middleware to track HTTP metrics
 */
export function metricsMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Skip metrics endpoint itself
    if (req.path === '/metrics') {
      return next();
    }

    const start = Date.now();
    const method = req.method;
    const path = normalizePath(req.path);

    // Track request size
    const contentLength = req.get('content-length');
    if (contentLength) {
      httpRequestSize.observe({ method, path }, parseInt(contentLength, 10));
    }

    // Wrap res.end to capture response metrics
    const originalEnd = res.end.bind(res);
    res.end = function (chunk?: any, encoding?: any, callback?: any) {
      const status = res.statusCode || 500;
      const duration = (Date.now() - start) / 1000;

      // Track metrics
      httpRequestsTotal.inc({ method, path, status });
      httpRequestDuration.observe({ method, path, status }, duration);

      // Track response size
      if (chunk) {
        const size = Buffer.byteLength(chunk, encoding || 'utf-8');
        httpResponseSize.observe({ method, path, status }, size);
      }

      // Call original end
      if (callback) {
        return originalEnd(chunk, encoding, callback);
      } else if (encoding) {
        return originalEnd(chunk, encoding);
      } else if (chunk) {
        return originalEnd(chunk);
      }
      return originalEnd();
    } as any;

    next();
  };
}

/**
 * Normalize path to avoid cardinality explosion
 * /api/user/123 → /api/user/:id
 * /api/merchant/abc/sales/456 → /api/merchant/:merchantId/sales/:saleId
 */
function normalizePath(path: string): string {
  return path
    .split('/')
    .map((segment) => {
      // UUID or MongoDB ObjectId pattern
      if (/^[0-9a-f]{24}$|^[0-9a-f-]{36}$|^\d+$/.test(segment)) {
        return ':id';
      }
      return segment;
    })
    .join('/');
}

/**
 * Track Prisma query metrics
 */
export function setupPrismaMetrics(prisma: any) {
  prisma.$use(async (params: any, next: any) => {
    const start = Date.now();
    const operation = params.action;
    const table = params.model;

    try {
      const result = await next(params);
      const duration = (Date.now() - start) / 1000;
      dbQueryDuration.observe({ operation, table }, duration);
      return result;
    } catch (error: unknown) {
      const errorType = error instanceof Error ? error.name : 'unknown';
      dbErrors.inc({ operation, table, error_type: errorType });
      throw error;
    }
  });
}

/**
 * Metrics endpoint handler
 */
export async function getMetrics(req: Request, res: Response) {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
}

/**
 * Export metrics summary
 */
export const metricsExport = {
  httpRequestsTotal,
  httpRequestDuration,
  httpRequestSize,
  httpResponseSize,
  salesTotal,
  salesAmount,
  refundsTotal,
  activeUsers,
  activeSessions,
  dbQueryDuration,
  dbConnections,
  dbErrors,
};

export default {
  metricsMiddleware,
  setupPrismaMetrics,
  getMetrics,
  metricsExport,
};
