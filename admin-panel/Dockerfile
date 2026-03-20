# Next.js Admin Panel - Multi-stage build

# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copy only package files first (better caching)
COPY package*.json ./
COPY tsconfig.json ./next.config.ts ./

# Install dependencies
RUN npm ci

# Copy source code
COPY src ./src
COPY public ./public

# Build Next.js
RUN npm run build

# Runtime stage
FROM node:22-alpine

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init curl

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

# Copy only necessary files from builder
COPY --from=builder --chown=nodejs:nodejs /app/.next ./.next
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/public ./public
COPY --chown=nodejs:nodejs package*.json ./

# Switch to non-root user
USER nodejs

# Environment variables
ENV NODE_ENV=production
ENV PORT=3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:3001/ || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start application
CMD ["npm", "start"]
