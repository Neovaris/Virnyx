import { create } from "zustand";
import type { MeResponse } from "@/lib/auth.shared";
import { clientMe, clientLogout } from "@/lib/auth.client";

type AuthState = {
  me: MeResponse["user"] | null;
  permissions: string[];
  loading: boolean;
  loadMe: () => Promise<void>;
  logout: () => Promise<void>;
  can: (perm: string) => boolean;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  me: null,
  permissions: [],
  loading: false,

  loadMe: async () => {
    set({ loading: true });
    try {
      const data = await clientMe();
      if (!data) {
        set({ me: null, permissions: [], loading: false });
        return;
      }
      set({ me: data.user, permissions: data.permissions ?? [], loading: false });
    } finally {
      set({ loading: false });
    }
  },

  logout: async () => {
    try {
      await clientLogout();
    } catch {}
    set({ me: null, permissions: [] });
  },

  can: (perm) => get().permissions.includes(perm),
}));