import { ROLES } from "@smartpos/shared";

export const isAdminRole = (role: string | undefined) => role === ROLES.ADMIN;

// Non-admin accounts only see the last 6 digits of a phone number: 0912345678 -> ****345678.
export function maskPhone(phone: string | null | undefined): string | null | undefined {
  if (!phone) return phone;
  const digits = phone.replace(/\s/g, "");
  if (digits.length <= 6) return digits;
  return "*".repeat(digits.length - 6) + digits.slice(-6);
}

// A masked value coming back from an edit form must never overwrite the real number.
export const isMasked = (phone: string | null | undefined) => !!phone && phone.includes("*");
