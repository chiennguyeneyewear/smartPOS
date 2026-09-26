import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CurrentUser } from "@smartpos/shared";
import { usePrintSettingsStore } from "./print-settings-store";

interface AuthState {
  accessToken: string | null;
  user: CurrentUser | null;
  activeBranchId: string | null;
  // Why the last session ended (deploy / admin change); shown once on the login page.
  sessionNotice: string | null;
  endSession: (notice: string) => void;
  clearSessionNotice: () => void;
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
      sessionNotice: null,
      endSession: (notice) => {
        usePrintSettingsStore.getState().resetReceiptBranchId();
        set({ accessToken: null, user: null, activeBranchId: null, sessionNotice: notice });
      },
      clearSessionNotice: () => set({ sessionNotice: null }),
      setAccessToken: (accessToken, user) =>
        set((state) => {
          // Keep the branch chosen in the switcher only while it still belongs to this account; after
          // a different user logs in on the same browser it would otherwise be someone else's branch.
          const stillAllowed = user.branches.some((b) => b.id === state.activeBranchId);
          return {
            accessToken,
            user,
            sessionNotice: null,
            activeBranchId: stillAllowed
              ? state.activeBranchId
              : (user.defaultBranchId ?? user.branches[0]?.id ?? null),
          };
        }),
      setActiveBranch: (activeBranchId) => set({ activeBranchId }),
      logout: () => {
        // Clear any manually-chosen "Chọn mẫu in" branch override so it can't leak
        // into the next cashier's session on a shared counter/browser — each account
        // now has its own defaultBranchId, which activeBranchId picks up on login.
        usePrintSettingsStore.getState().resetReceiptBranchId();
        set({ accessToken: null, user: null, activeBranchId: null });
      },
    }),
    {
      name: "smartpos-auth",
      partialize: (state) => ({
        accessToken: state.accessToken,
        user: state.user,
        activeBranchId: state.activeBranchId,
        sessionNotice: state.sessionNotice,
      }),
    },
  ),
);
