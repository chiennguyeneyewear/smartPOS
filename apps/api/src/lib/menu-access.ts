import { DEFAULT_MENU_ACCESS, type RoleName } from "@smartpos/shared";

// Empty menuAccess on a user means "use the role's default" rather than "no access" —
// this way existing users keep working after the column was added, and admins only
// need to set menuAccess explicitly when they want to deviate from the role default.
export function resolveMenuAccess(menuAccess: string[], roleName: string): string[] {
  if (menuAccess.length > 0) return menuAccess;
  return DEFAULT_MENU_ACCESS[roleName as RoleName] ?? [];
}
