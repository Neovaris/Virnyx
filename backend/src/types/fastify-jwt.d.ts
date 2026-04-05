import "@fastify/jwt";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: {
      sub: string;
      merchantId: string;
      storeId?: string | null;
      roles?: string[];
      permissions?: string[]
    };
    user: {
      sub: string;
      merchantId: string;
      storeId?: string | null;
      roles?: string[];
      permissions?: string[]
    };
  }
}