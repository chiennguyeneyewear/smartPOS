import { NavLink } from "react-router-dom";
import { LayoutDashboard, ShoppingCart, Package, Users, ClipboardList, ListChecks, UserCog, Store } from "lucide-react";
import { MENU_ITEMS } from "@smartpos/shared";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";

export const NAV_ITEMS = [
  { to: "/dashboard", label: "Tổng quan", icon: LayoutDashboard, menuKey: MENU_ITEMS.DASHBOARD },
  { to: "/pos", label: "Bán hàng", icon: ShoppingCart, menuKey: MENU_ITEMS.POS },
  { to: "/inventory/products", label: "Hàng hóa", icon: Package, menuKey: MENU_ITEMS.PRODUCTS },
  { to: "/customers", label: "Khách hàng", icon: Users, menuKey: MENU_ITEMS.CUSTOMERS },
  { to: "/orders", label: "Đơn hàng", icon: ClipboardList, menuKey: MENU_ITEMS.ORDERS },
  { to: "/tasks", label: "Quản lý công việc", icon: ListChecks, menuKey: MENU_ITEMS.TASKS },
  { to: "/settings/users", label: "Quản lý người dùng", icon: UserCog, menuKey: MENU_ITEMS.USERS },
  { to: "/settings/branches", label: "Cửa hàng", icon: Store, menuKey: MENU_ITEMS.BRANCHES },
] as const;

const linkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
    isActive
      ? "bg-primary text-primary-foreground"
      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
  );

export function Sidebar() {
  const menuAccess = useAuthStore((s) => s.user?.menuAccess) ?? [];
  const items = NAV_ITEMS.filter((item) => menuAccess.includes(item.menuKey));

  return (
    <aside className="flex h-full w-56 shrink-0 flex-col border-r bg-card">
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
          S
        </div>
        <span className="text-sm font-semibold">SmartPOS</span>
      </div>
      <nav className="flex-1 space-y-1 p-2">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink key={item.to} to={item.to} className={linkClass}>
              <Icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
