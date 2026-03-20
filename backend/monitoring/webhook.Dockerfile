# AlertManager Webhook Handler

FROM node:22-alpine

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

# Install dependencies
RUN npm install nodemailer

# Copy webhook script
COPY monitoring/webhook.js .

# Create package.json
RUN cat > package.json << 'EOF'
{
  "name": "virnyx-alertmanager-webhook",
  "version": "1.0.0",
  "description": "AlertManager webhook handler for Discord and email",
  "main": "webhook.js",
  "dependencies": {
    "nodemailer": "^6.9.7"
  }
}
EOF

RUN npm install --omit=dev

# Switch to non-root user
USER nodejs

EXPOSE 5001

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5001/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

CMD ["node", "webhook.js"]
