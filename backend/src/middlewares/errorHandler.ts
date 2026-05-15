import { FastifyReply, FastifyRequest } from "fastify";
import { logError } from "../common/logger";

export async function globalErrorHandler(
  err: any,
  request: FastifyRequest,
  reply: FastifyReply
) {
  // Log the error
  logError(`Unhandled error: ${err.message}`, {
    error: err.message,
    stack: err.stack,
    method: request.method,
    url: request.url,
    statusCode: err.statusCode || 500,
    userId: (request.user as any)?.sub,
    merchantId: (request.user as any)?.merchantId,
  });

  // Determine status code
  const statusCode = err.statusCode || 500;

  // Handle Prisma connection errors (e.g. P1001 / unreachable DB host)
  const isPrismaConnectivityError =
    err.code === "P1001" ||
    /Can't reach database server/i.test(String(err.message || ""));

  if (isPrismaConnectivityError) {
    return reply.code(503).send({
      message: "Database temporarily unavailable",
      code: "DB_UNAVAILABLE",
    });
  }

  // Handle other Prisma errors
  if (err.code?.startsWith("P")) {
    logError("Prisma error", {
      code: err.code,
      message: err.message,
    });

    return reply.code(400).send({
      message: "Database error occurred",
      code: "DB_ERROR",
    });
  }

  // Handle Zod validation errors
  if (err.name === "ZodError") {
    return reply.code(400).send({
      message: "Validation error",
      errors: err.errors,
      code: "VALIDATION_ERROR",
    });
  }

  // Handle JWT errors
  if (err.name === "UnauthorizedError" || err.statusCode === 401) {
    return reply.code(401).send({
      message: "Unauthorized",
      code: "UNAUTHORIZED",
    });
  }

  // Handle custom errors with statusCode property
  if (err.statusCode && err.payload) {
    return reply.code(err.statusCode).send(err.payload);
  }

  // Default error response
  return reply.code(statusCode).send({
    message: err.message || "Internal server error",
    code: "INTERNAL_SERVER_ERROR",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
}
