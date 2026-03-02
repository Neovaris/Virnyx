export type MeResponse = {
  user: {
    id: string;
    fullName: string;
    email: string;
    merchantId: string;
    storeId: string | null;
    createdAt: string;
    lastLoginAt: string | null;
  };
  roles: string[];
  permissions: string[];
};

export async function clientMe(): Promise<MeResponse | null> {
  const res = await fetch("/api/auth/me", { cache: "no-store" });
  if (!res.ok) return null;
  return res.json();
}

export async function clientLogout() {
  await fetch("/api/auth/logout", { method: "POST" });
}