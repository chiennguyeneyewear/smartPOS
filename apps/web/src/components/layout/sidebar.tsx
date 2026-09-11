import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  ClipboardList,
  BarChart3,
  FileBarChart,
  UserCog,
  ChevronDown,
} from "lucide-react";
import { MENU_ITEMS } from "@smartpos/shared";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Tổng quan", icon: LayoutDashboard, menuKey: MENU_ITEMS.DASHBOARD },
  { to: "/pos", label: "Bán hàng", icon: ShoppingCart, menuKey: MENU_ITEMS.POS },
  { to: "/inventory/products", label: "Hàng hóa", icon: Package, menuKey: MENU_ITEMS.PRODUCTS },
  { to: "/customers", label: "Khách hàng", icon: Users, menuKey: MENU_ITEMS.CUSTOMERS },
  { to: "/orders", label: "Đơn hàng", icon: ClipboardList, menuKey: MENU_ITEMS.ORDERS },
  {
    label: "Phân tích",
    icon: BarChart3,
    menuKey: MENU_ITEMS.REPORTS,
    children: [
      { to: "/reports", label: "Kinh doanh" },
      { to: "/reports/category-performance", label: "Hàng hóa" },
      { to: "/reports/customer-insights", label: "Khách hàng" },
      { to: "/reports/seller-performance", label: "Hiệu quả" },
    ],
  },
  {
    label: "Báo cáo",
    icon: FileBarChart,
    menuKey: MENU_ITEMS.REPORTS,
    children: [
      { to: "/reports/end-of-day", label: "Cuối ngày" },
      { to: "/reports/sales", label: "Bán hàng" },
      { to: "/reports/orders", label: "Đặt hàng" },
      { to: "/reports/products", label: "Hàng hóa" },
      { to: "/reports/customers", label: "Khách hàng" },
    ],
  },
  { to: "/settings/users", label: "Quản lý người dùng", icon: UserCog, menuKey: MENU_ITEMS.USERS },
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
  const location = useLocation();
  const items = NAV_ITEMS.filter((item) => menuAccess.includes(item.menuKey));

  const [openGroup, setOpenGroup] = useState<string | null>(() =>
    items.find((item) => "children" in item && item.children.some((c) => location.pathname === c.to))?.label ?? null,
  );

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
          if ("children" in item) {
            const isOpen = openGroup === item.label;
            return (
              <div key={item.label}>
                <button
                  type="button"
                  onClick={() => setOpenGroup(isOpen ? null : item.label)}
                  className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  <Icon className="h-4 w-4" />
                  <span className="flex-1 text-left">{item.label}</span>
                  <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", isOpen && "rotate-180")} />
                </button>
                {isOpen && (
                  <div className="ml-4 mt-1 space-y-1 border-l pl-3">
                    {item.children.map((child) => (
                      <NavLink key={child.to} to={child.to} className={linkClass}>
                        {child.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          }
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
