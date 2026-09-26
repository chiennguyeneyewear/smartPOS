import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "@/stores/auth-store";
import { useSessionWatch } from "@/hooks/use-session-watch";

export function ProtectedRoute() {
  const accessToken = useAuthStore((s) => s.accessToken);
  useSessionWatch();
  if (!accessToken) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}
