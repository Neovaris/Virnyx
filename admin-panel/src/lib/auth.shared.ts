// src/lib/auth.shared.ts
export type MeResponse = {
  user: {
    id: string;
    fullName: string;
    email: string;
    merchantId: string;
    storeId?: string | null;
    storeName?: string | null;
    createdAt: string;
    lastLoginAt?: string | null;
  };
  roles: string[];
  permissions: string[];
};

export function isAdmin(me: MeResponse | null) {
  return Boolean(me?.roles?.includes("ADMIN"));
}

export function can(me: MeResponse | null, perm: string) {
  return Boolean(me?.permissions?.includes(perm));
}