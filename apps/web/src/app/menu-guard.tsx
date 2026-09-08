import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { MENU_ITEMS, type MenuKey } from "@smartpos/shared";
import { useAuthStore } from "@/stores/auth-store";

// Order matters: first item the user has access to becomes the fallback redirect
// target when they hit a page (via URL, bookmark, back-button, ...) that isn't in
// their menuAccess — mirrors the sidebar's top-to-bottom order.
const MENU_ORDER: MenuKey[] = [
  MENU_ITEMS.DASHBOARD,
  MENU_ITEMS.POS,
  MENU_ITEMS.PRODUCTS,
  MENU_ITEMS.CUSTOMERS,
  MENU_ITEMS.REPORTS,
  MENU_ITEMS.USERS,
];

const MENU_ROUTES: Record<MenuKey, string> = {
  [MENU_ITEMS.DASHBOARD]: "/dashboard",
  [MENU_ITEMS.POS]: "/pos",
  [MENU_ITEMS.PRODUCTS]: "/inventory/products",
  [MENU_ITEMS.CUSTOMERS]: "/customers",
  [MENU_ITEMS.REPORTS]: "/reports",
  [MENU_ITEMS.USERS]: "/settings/users",
};

export function MenuGuard({ menuKey, children }: { menuKey: MenuKey; children: ReactNode }) {
  const menuAccess = useAuthStore((s) => s.user?.menuAccess) ?? [];

  if (menuAccess.includes(menuKey)) {
    return <>{children}</>;
  }

  const fallback = MENU_ORDER.find((key) => menuAccess.includes(key));
  return <Navigate to={fallback ? MENU_ROUTES[fallback] : "/login"} replace />;
}
