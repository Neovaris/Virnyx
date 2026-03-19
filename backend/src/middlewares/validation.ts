import { FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";

/**
 * Creates a validation middleware factory for Fastify
 * Returns a preHandler function that validates request body against a Zod schema
 */
export function createValidationMiddleware<T>(schema: z.ZodSchema<T>) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Validate request body
      const validatedBody = schema.parse(request.body);
      // Replace request body with validated (normalized) version
      request.body = validatedBody;
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Format error messages for the response
        const formattedErrors = error.issues.map((issue) => ({
          field: issue.path.join(".") || "root",
          code: issue.code,
          message: issue.message,
        }));

        // Send error response and halt further processing
        await reply.code(400).send({
          error: "Validation Error",
          message: "Request validation failed",
          details: formattedErrors,
        });
        
        // Prevent further middleware/route execution
        return;
      }

      // Re-throw if it's not a Zod error
      throw error;
    }
  };
}

/**
 * Creates a query parameter validation middleware factory
 */
export function createQueryValidationMiddleware<T>(schema: z.ZodSchema<T>) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const validatedQuery = schema.parse(request.query);
      request.query = validatedQuery as any;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const formattedErrors = error.issues.map((issue) => ({
          field: issue.path.join(".") || "root",
          code: issue.code,
          message: issue.message,
        }));

        await reply.code(400).send({
          error: "Validation Error",
          message: "Query parameters validation failed",
          details: formattedErrors,
        });
        
        return;
      }

      throw error;
    }
  };
}

/**
 * Creates a params (URL route parameters) validation middleware factory
 */
export function createParamsValidationMiddleware<T>(schema: z.ZodSchema<T>) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const validatedParams = schema.parse(request.params);
      request.params = validatedParams as any;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const formattedErrors = error.issues.map((issue) => ({
          field: issue.path.join(".") || "root",
          code: issue.code,
          message: issue.message,
        }));

        await reply.code(400).send({
          error: "Validation Error",
          message: "URL parameters validation failed",
          details: formattedErrors,
        });
        
        return;
      }

      throw error;
    }
  };
}
