import { useAuthStore } from "@/stores/auth-store";

// CS1/CS2/CS3 are one business (shared warehouse, shared customers), so an
// admin viewing a report/dashboard/orders page should see all 3 branches
// combined by default, not just whichever branch happens to be "active" in
// their topbar switcher. Non-admins stay scoped to their own branch, same as
// before. The backend already aggregates across all branches whenever
// branchId is omitted (see branch-scope.ts), so this is the only change
// needed to fix admin-facing views.
export function useReportBranchId(): string | undefined {
  const activeBranchId = useAuthStore((s) => s.activeBranchId);
  const role = useAuthStore((s) => s.user?.role);
  return role === "admin" ? undefined : activeBranchId ?? undefined;
}
