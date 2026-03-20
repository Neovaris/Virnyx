#!/usr/bin/env node

/**
 * Virnyx Database Backup Management Script
 * TypeScript version for Node.js
 *
 * Usage:
 *   npm run backup              - Create a backup
 *   npm run backup:restore      - Restore from backup
 *   npm run backup:list         - List backups
 *   npm run backup:cleanup      - Clean old backups
 */

import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import dotenv from "dotenv";

// Load environment
dotenv.config();

interface BackupConfig {
  dbUser: string;
  dbName: string;
  dbHost: string;
  dbPort: number;
  dbPassword: string;
  backupDir: string;
  retentionDays: number;
}

const config: BackupConfig = {
  dbUser: process.env.POSTGRES_USER || "virnyx",
  dbName: process.env.POSTGRES_DB || "virnyx",
  dbHost: process.env.POSTGRES_HOST || "localhost",
  dbPort: parseInt(process.env.POSTGRES_PORT || "5432"),
  dbPassword: process.env.POSTGRES_PASSWORD || "virnyxpass",
  backupDir: "./backups",
  retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS || "30"),
};

// Colors for console output
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  blue: "\x1b[34m",
};

function log(type: "info" | "warn" | "error" | "success", message: string) {
  const timestamp = new Date().toISOString().split("T")[1].split(".")[0];
  const prefix = {
    info: `${colors.blue}[INFO]${colors.reset}`,
    warn: `${colors.yellow}[WARN]${colors.reset}`,
    error: `${colors.red}[ERROR]${colors.reset}`,
    success: `${colors.green}[✓]${colors.reset}`,
  }[type];

  console.log(`${prefix} ${message}`);
}

function ensureBackupDir() {
  if (!fs.existsSync(config.backupDir)) {
    fs.mkdirSync(config.backupDir, { recursive: true });
  }
}

function getFormattedTimestamp(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const mins = String(now.getMinutes()).padStart(2, "0");
  const secs = String(now.getSeconds()).padStart(2, "0");
  return `${year}${month}${day}_${hours}${mins}${secs}`;
}

function verifyConnection(): boolean {
  try {
    const cmd = `pg_isready -U ${config.dbUser} -h ${config.dbHost} -p ${config.dbPort}`;
    execSync(cmd, { stdio: "pipe" });
    log("info", "Database connection verified");
    return true;
  } catch (error) {
    log("error", `Cannot connect to database at ${config.dbHost}:${config.dbPort}`);
    return false;
  }
}

function createBackup() {
  if (!verifyConnection()) {
    process.exit(1);
  }

  ensureBackupDir();

  const timestamp = getFormattedTimestamp();
  const backupFile = path.join(config.backupDir, `virnyx_${timestamp}.sql.gz`);

  log("info", "Starting database backup...");

  try {
    const cmd =
      `PGPASSWORD="${config.dbPassword}" pg_dump -U ${config.dbUser} ` +
      `-h ${config.dbHost} -p ${config.dbPort} ${config.dbName} | gzip > "${backupFile}"`;

    execSync(cmd, { stdio: "inherit", shell: "/bin/bash" });

    const stats = fs.statSync(backupFile);
    const sizeInMB = (stats.size / 1024 / 1024).toFixed(2);

    log("success", "Backup completed successfully");
    log("info", `File: ${backupFile}`);
    log("info", `Size: ${sizeInMB} MB`);
  } catch (error) {
    log("error", "Backup failed!");
    if (fs.existsSync(backupFile)) {
      fs.unlinkSync(backupFile);
    }
    process.exit(1);
  }
}

function listBackups() {
  ensureBackupDir();

  const files = fs
    .readdirSync(config.backupDir)
    .filter((f) => f.endsWith(".sql.gz"))
    .sort()
    .reverse();

  if (files.length === 0) {
    log("warn", "No backups found");
    return;
  }

  log("info", "Available backups:");
  files.forEach((file) => {
    const fullPath = path.join(config.backupDir, file);
    const stats = fs.statSync(fullPath);
    const sizeInMB = (stats.size / 1024 / 1024).toFixed(2);
    const mtime = new Date(stats.mtime).toLocaleString();

    console.log(`  ${file}`);
    console.log(`    Size: ${sizeInMB} MB | Modified: ${mtime}`);
  });

  log("info", `Total backups: ${files.length}`);
}

function restoreBackup(backupFile: string) {
  if (!verifyConnection()) {
    process.exit(1);
  }

  if (!fs.existsSync(backupFile)) {
    log("error", `Backup file not found: ${backupFile}`);
    process.exit(1);
  }

  log("warn", "⚠️  This will overwrite the current database!");
  log("warn", `Restoring from: ${backupFile}`);

  // In non-interactive mode, skip confirmation
  if (process.env.SKIP_RESTORE_CONFIRM !== "true") {
    log("info", "Restore requires confirmation. Set SKIP_RESTORE_CONFIRM=true to skip.");
    process.exit(0);
  }

  try {
    log("info", "Starting database restore...");

    const cmd =
      `gunzip -c "${backupFile}" | PGPASSWORD="${config.dbPassword}" ` +
      `psql -U ${config.dbUser} -h ${config.dbHost} -p ${config.dbPort} ${config.dbName}`;

    execSync(cmd, { stdio: "inherit", shell: "/bin/bash" });

    log("success", "Restore completed successfully");
  } catch (error) {
    log("error", "Restore failed!");
    process.exit(1);
  }
}

function cleanupOldBackups() {
  ensureBackupDir();

  const files = fs.readdirSync(config.backupDir).filter((f) => f.match(/virnyx_\d+\.sql\.gz/));

  if (files.length === 0) {
    log("info", "No backups to clean up");
    return;
  }

  const now = Date.now();
  const retentionMs = config.retentionDays * 24 * 60 * 60 * 1000;
  let deletedCount = 0;

  files.forEach((file) => {
    const fullPath = path.join(config.backupDir, file);
    const stats = fs.statSync(fullPath);
    const age = now - stats.mtime.getTime();

    if (age > retentionMs) {
      log("warn", `Removing old backup: ${file}`);
      fs.unlinkSync(fullPath);
      deletedCount++;
    }
  });

  if (deletedCount > 0) {
    log("success", `Deleted ${deletedCount} old backup(s)`);
  } else {
    log("info", `No backups older than ${config.retentionDays} days`);
  }
}

function showHelp() {
  console.log(`
Virnyx Database Backup Management

Usage:
  npx ts-node backup-database.ts [command]

Commands:
  backup           Create a new database backup
  restore <file>   Restore database from backup file
  list             List all available backups
  cleanup          Remove backups older than ${config.retentionDays} days
  help             Show this help message

Environment Variables:
  POSTGRES_USER              Database user (default: virnyx)
  POSTGRES_PASSWORD          Database password
  POSTGRES_HOST              Database host (default: localhost)
  POSTGRES_PORT              Database port (default: 5432)
  POSTGRES_DB                Database name (default: virnyx)
  BACKUP_RETENTION_DAYS      Keep backups for N days (default: 30)
  SKIP_RESTORE_CONFIRM       Skip restore confirmation (default: false)

Examples:
  # Create a backup
  npx ts-node backup-database.ts backup

  # List all backups
  npx ts-node backup-database.ts list

  # Restore from a specific backup
  npx ts-node backup-database.ts restore ./backups/virnyx_20260318_120000.sql.gz
  `);
}

// Main CLI handler
const command = process.argv[2] || "backup";

switch (command) {
  case "backup":
    createBackup();
    break;
  case "restore":
    const backupPath = process.argv[3];
    if (!backupPath) {
      log("error", "Please specify backup file");
      log("info", "Usage: backup-database.ts restore <backup-file>");
      process.exit(1);
    }
    restoreBackup(backupPath);
    break;
  case "list":
    listBackups();
    break;
  case "cleanup":
    cleanupOldBackups();
    break;
  case "help":
  case "--help":
  case "-h":
    showHelp();
    break;
  default:
    log("error", `Unknown command: ${command}`);
    showHelp();
    process.exit(1);
}
