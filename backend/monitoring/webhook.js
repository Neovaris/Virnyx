#!/usr/bin/env node

/**
 * AlertManager Webhook Handler
 * Receives alerts from AlertManager and routes them to Discord and email
 */

const http = require('http');
const { URL } = require('url');
const nodemailer = require('nodemailer');

const PORT = process.env.PORT || 5001;
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
const ALERT_EMAIL = process.env.ALERT_EMAIL;
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = process.env.SMTP_PORT || 587;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASSWORD = process.env.SMTP_PASSWORD;
const ALERT_FROM = process.env.ALERT_FROM || 'alerts@virnyx.local';

// Initialize mail transporter
const mailer = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT === 465,
  auth: SMTP_USER && SMTP_PASSWORD ? {
    user: SMTP_USER,
    pass: SMTP_PASSWORD,
  } : undefined,
});

/**
 * Send alert to Discord
 */
async function sendToDiscord(alerts, severity) {
  if (!DISCORD_WEBHOOK_URL) return;

  const severityColors = {
    critical: 0xFF0000,  // Red
    warning: 0xFFA500,   // Orange
    info: 0x0099FF,      // Blue
  };

  const embedFields = [];

  for (const alert of alerts.slice(0, 10)) {
    embedFields.push({
      name: alert.labels.alertname,
      value: `Status: **${alert.status.toUpperCase()}**\n${alert.annotations.summary}`,
      inline: false,
    });

    if (alert.annotations.description) {
      embedFields.push({
        name: 'Details',
        value: alert.annotations.description,
        inline: false,
      });
    }
  }

  const embed = {
    color: severityColors[severity] || 0x808080,
    title: `${severity.toUpperCase()} - Virnyx Alert`,
    fields: embedFields,
    timestamp: new Date().toISOString(),
    footer: {
      text: 'Virnyx Monitoring',
    },
  };

  try {
    const response = await fetch(DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'Virnyx Alerts',
        avatar_url: 'https://raw.githubusercontent.com/prometheus/prometheus/main/console/prometheus.png',
        embeds: [embed],
      }),
    });

    if (!response.ok) {
      console.error(`Discord webhook failed: ${response.status}`);
    }
  } catch (error) {
    console.error('Failed to send Discord alert:', error.message);
  }
}

/**
 * Send alert via email
 */
async function sendEmail(alerts, severity) {
  if (!ALERT_EMAIL || !SMTP_USER) return;

  const alertDetails = alerts.map(alert => `
<tr>
  <td style="padding: 10px; border: 1px solid #ddd;">
    <strong>${alert.labels.alertname}</strong><br>
    <small>Service: ${alert.labels.service || 'unknown'}</small><br>
    Status: <span style="color: ${alert.status === 'firing' ? 'red' : 'green'};">${alert.status.toUpperCase()}</span>
  </td>
  <td style="padding: 10px; border: 1px solid #ddd;">
    <strong>${alert.annotations.summary}</strong><br>
    ${alert.annotations.description || ''}
  </td>
</tr>
  `).join('');

  const severityColors = {
    critical: '#ff4444',
    warning: '#ff9900',
    info: '#0099ff',
  };

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; }
    .header { background-color: ${severityColors[severity] || '#808080'}; color: white; padding: 20px; }
    .header h1 { margin: 0; }
    .content { padding: 20px; }
    table { width: 100%; border-collapse: collapse; }
    td { padding: 10px; border: 1px solid #ddd; }
    .footer { padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🚨 ${severity.toUpperCase()} Alert Notification</h1>
    <p>Virnyx Monitoring System</p>
  </div>
  <div class="content">
    <h2>Alert Summary</h2>
    <p>Total Alerts: <strong>${alerts.length}</strong></p>
    <table>
      <tr>
        <th>Alert Name</th>
        <th>Description</th>
      </tr>
      ${alertDetails}
    </table>
  </div>
  <div class="footer">
    <p>Timestamp: ${new Date().toISOString()}</p>
    <p><a href="http://localhost:3002">View in Grafana</a> | <a href="http://localhost:9090">View in Prometheus</a></p>
  </div>
</body>
</html>
  `;

  try {
    await mailer.sendMail({
      from: ALERT_FROM,
      to: ALERT_EMAIL,
      subject: `[${severity.toUpperCase()}] Virnyx Alert: ${alerts[0]?.labels.alertname || 'Unknown'}`,
      html,
    });
    console.log(`Email sent to ${ALERT_EMAIL}`);
  } catch (error) {
    console.error('Failed to send email:', error.message);
  }
}

/**
 * Parse AlertManager webhook payload
 */
function parseAlerts(bodyStr) {
  try {
    return JSON.parse(bodyStr);
  } catch (error) {
    console.error('Failed to parse alert payload:', error.message);
    return null;
  }
}

/**
 * HTTP server
 */
const server = http.createServer(async (req, res) => {
  // Health check endpoint
  if (req.url === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }

  // AlertManager webhook
  if (req.url.startsWith('/alert') && req.method === 'POST') {
    let body = '';

    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      const payload = parseAlerts(body);
      if (!payload) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
        return;
      }

      const alerts = payload.alerts || [];
      const severity = req.url.split('/').pop() || 'info';

      console.log(`\n📬 Received ${alerts.length} ${severity} alert(s)`);
      alerts.forEach(alert => {
        console.log(`  - ${alert.labels.alertname} (${alert.status})`);
      });

      // Send to Discord and email
      await Promise.all([
        sendToDiscord(alerts, severity),
        sendEmail(alerts, severity),
      ]);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        status: 'received',
        count: alerts.length,
        timestamp: new Date().toISOString(),
      }));
    });

    return;
  }

  // 404
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not Found' }));
});

server.listen(PORT, () => {
  console.log(`🚨 AlertManager webhook listening on port ${PORT}`);
  console.log(`   Discord: ${DISCORD_WEBHOOK_URL ? '✓' : '✗'}`);
  console.log(`   Email: ${ALERT_EMAIL ? '✓' : '✗'}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down...');
  server.close(() => {
    process.exit(0);
  });
});
