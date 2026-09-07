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
