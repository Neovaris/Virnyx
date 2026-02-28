import "@fastify/jwt";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: {
      sub: string;
      merchantId: string;
      storeId?: string | null;
    };
    user: {
      sub: string;
      merchantId: string;
      storeId?: string | null;
    };
  }
}