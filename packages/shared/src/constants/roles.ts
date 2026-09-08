export const ROLES = {
  ADMIN: "admin",
  MANAGER: "manager",
  CASHIER: "cashier",
  WAREHOUSE: "warehouse",
} as const;

export type RoleName = (typeof ROLES)[keyof typeof ROLES];

export const PERMISSIONS = {
  SALES_CREATE: "sales:create",
  SALES_VOID: "sales:void",
  INVENTORY_VIEW: "inventory:view",
  INVENTORY_ADJUST: "inventory:adjust",
  INVENTORY_TRANSFER: "inventory:transfer",
  PRODUCTS_MANAGE: "products:manage",
  CUSTOMERS_MANAGE: "customers:manage",
  SUPPLIERS_MANAGE: "suppliers:manage",
  REPORTS_VIEW: "reports:view",
  USERS_MANAGE: "users:manage",
  BRANCHES_MANAGE: "branches:manage",
} as const;

export type PermissionName = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ROLE_PERMISSIONS: Record<RoleName, PermissionName[]> = {
  [ROLES.ADMIN]: Object.values(PERMISSIONS),
  [ROLES.MANAGER]: [
    PERMISSIONS.SALES_CREATE,
    PERMISSIONS.SALES_VOID,
    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.INVENTORY_ADJUST,
    PERMISSIONS.INVENTORY_TRANSFER,
    PERMISSIONS.PRODUCTS_MANAGE,
    PERMISSIONS.CUSTOMERS_MANAGE,
    PERMISSIONS.SUPPLIERS_MANAGE,
    PERMISSIONS.REPORTS_VIEW,
  ],
  [ROLES.CASHIER]: [
    PERMISSIONS.SALES_CREATE,
    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.CUSTOMERS_MANAGE,
  ],
  [ROLES.WAREHOUSE]: [
    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.INVENTORY_ADJUST,
    PERMISSIONS.INVENTORY_TRANSFER,
    PERMISSIONS.PRODUCTS_MANAGE,
    PERMISSIONS.SUPPLIERS_MANAGE,
  ],
};

// Menu items correspond 1:1 to the sidebar entries in apps/web. Independent from
// PERMISSIONS (which gate actions) — this controls what a user can even *see* in
// the nav, and is set per-user (defaulting from their role) rather than fixed by role.
export const MENU_ITEMS = {
  DASHBOARD: "dashboard",
  POS: "pos",
  PRODUCTS: "products",
  CUSTOMERS: "customers",
  REPORTS: "reports",
  USERS: "users",
} as const;

export type MenuKey = (typeof MENU_ITEMS)[keyof typeof MENU_ITEMS];

export const MENU_ITEM_LABELS: Record<MenuKey, string> = {
  [MENU_ITEMS.DASHBOARD]: "Tổng quan",
  [MENU_ITEMS.POS]: "Bán hàng",
  [MENU_ITEMS.PRODUCTS]: "Hàng hóa",
  [MENU_ITEMS.CUSTOMERS]: "Khách hàng",
  [MENU_ITEMS.REPORTS]: "Báo cáo",
  [MENU_ITEMS.USERS]: "Quản lý người dùng",
};

export const DEFAULT_MENU_ACCESS: Record<RoleName, MenuKey[]> = {
  [ROLES.ADMIN]: Object.values(MENU_ITEMS),
  [ROLES.MANAGER]: [
    MENU_ITEMS.DASHBOARD,
    MENU_ITEMS.POS,
    MENU_ITEMS.PRODUCTS,
    MENU_ITEMS.CUSTOMERS,
    MENU_ITEMS.REPORTS,
  ],
  [ROLES.CASHIER]: [MENU_ITEMS.POS, MENU_ITEMS.PRODUCTS, MENU_ITEMS.CUSTOMERS],
  [ROLES.WAREHOUSE]: [MENU_ITEMS.PRODUCTS],
};
