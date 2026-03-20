import winston from "winston";
import path from "path";
import fs from "fs";

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, "../../logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for console output
const colors = {
  error: "red",
  warn: "yellow",
  info: "green",
  http: "magenta",
  debug: "white",
};

winston.addColors(colors);

// Define format
const format = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss:ms" }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Define transports
const transports = [
  // Console transport
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize({ all: true }),
      winston.format.printf(
        (info) =>
          `${info.timestamp} ${info.level}: ${info.message}`
      )
    ),
  }),
  
  // Error log file
  new winston.transports.File({
    filename: path.join(logsDir, "error.log"),
    level: "error",
    format: format,
  }),
  
  // Combined log file
  new winston.transports.File({
    filename: path.join(logsDir, "combined.log"),
    format: format,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }),
];

// Create logger instance
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "debug",
  levels,
  format,
  transports,
});

// Export convenience functions
export const logInfo = (message: string, data?: any) => {
  logger.info(message, data);
};

export const logError = (message: string, error?: any) => {
  if (error instanceof Error) {
    logger.error(message, { error: error.message, stack: error.stack });
  } else {
    logger.error(message, error);
  }
};

export const logWarn = (message: string, data?: any) => {
  logger.warn(message, data);
};

export const logDebug = (message: string, data?: any) => {
  logger.debug(message, data);
};

// HTTP logging middleware
export const createHttpLogger = () => {
  return async (request: any, reply: any) => {
    const start = Date.now();
    
    // Store start time on request
    (request as any).startTime = start;
  };
};

// Response logging hook - use this to log after response is sent
export const createResponseLogger = () => {
  return async (request: any, reply: any) => {
    const start = (request as any).startTime || Date.now();
    const duration = Date.now() - start;
    
    const logData = {
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    };

    // Add user info if authenticated
    if (request.user) {
      (logData as any).userId = request.user.sub;
      (logData as any).merchantId = request.user.merchantId;
    }

    if (reply.statusCode >= 400) {
      logWarn(`HTTP ${request.method} ${request.url} - ${reply.statusCode}`, logData);
    } else {
      logDebug(`HTTP ${request.method} ${request.url} - ${reply.statusCode}`, logData);
    }
  };
};
