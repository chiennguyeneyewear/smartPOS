import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CurrentUser } from "@smartpos/shared";

interface AuthState {
  accessToken: string | null;
  user: CurrentUser | null;
  activeBranchId: string | null;
  setAccessToken: (token: string, user: CurrentUser) => void;
  setActiveBranch: (branchId: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      activeBranchId: null,
      setAccessToken: (accessToken, user) =>
        set((state) => ({
          accessToken,
          user,
          activeBranchId: state.activeBranchId ?? user.defaultBranchId ?? user.branches[0]?.id ?? null,
        })),
      setActiveBranch: (activeBranchId) => set({ activeBranchId }),
      logout: () => set({ accessToken: null, user: null, activeBranchId: null }),
    }),
    {
      name: "smartpos-auth",
      partialize: (state) => ({
        accessToken: state.accessToken,
        user: state.user,
        activeBranchId: state.activeBranchId,
      }),
    },
  ),
);
