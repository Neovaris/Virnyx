import { create } from "zustand";
import { getMe, type MeResponse } from "@/lib/auth";
import { clientMe } from "@/lib/auth.client";

type AuthState = {
  token: string | null;
  me: MeResponse["user"] | null;
  permissions: string[];
  loading: boolean;
  setToken: (token: string | null) => void;
  loadMe: () => Promise<void>;
  logout: () => void;
  can: (perm: string) => boolean;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  token: typeof window !== "undefined" ? localStorage.getItem("vrx_token") : null,
  me: null,
  permissions: [],
  loading: false,

  setToken: (token) => {
    set({ token });
    if (typeof window !== "undefined") {
      if (token) localStorage.setItem("vrx_token", token);
      else localStorage.removeItem("vrx_token");
    }
  },

  loadMe: async () => {
    set({ loading: true });
    try {
      const data = await getMe();
      set({ me: data.user, permissions: data.permissions ?? [], loading: false });
    } catch {
      get().logout();
      set({ loading: false });
    }
  },

  logout: () => {
    set({ token: null, me: null, permissions: [] });
    if (typeof window !== "undefined") localStorage.removeItem("vrx_token");
  },

  can: (perm) => get().permissions.includes(perm),
}));