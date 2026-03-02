import { api } from "./api";
import { cookies } from "next/headers";

export type MeResponse = {
  user: {
    id: string;
    fullName: string;
    email: string;
    merchantId: string;
    storeId?: string | null;
    createdAt: string;
    lastLoginAt?: string | null;
  };
  roles: string[];
  permissions: string[];
};

export async function login(email: string, password: string) {
  const res = await api.post("/auth/login", { email, password });
  return res.data; // expect { token, ... }
}

export async function getMe() {
  const res = await api.get("/auth/me");
  return res.data as MeResponse;
}

export async function fetchMe(): Promise<MeResponse | null> {
  const token = (await cookies()).get("token")?.value;
  if (!token) return null;

  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL!;
  const res = await fetch(`${apiBase}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!res.ok) return null;
  return (await res.json()) as MeResponse;
}

export function isAdmin(me: MeResponse | null) {
  return Boolean(me?.roles?.includes("ADMIN"));
}

export function can(me: MeResponse | null, perm: string) {
  return Boolean(me?.permissions?.includes(perm));
}