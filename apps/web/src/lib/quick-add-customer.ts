import type { CustomerInput } from "@smartpos/shared";

// Text that failed to match any customer in a search box: mostly digits and reasonably phone-length ->
// treat it as the phone number typed in; otherwise treat it as the name. Either way it's carried into
// "Thêm khách hàng mới" instead of asking the person to type it again.
export function quickAddDefaults(query: string): Partial<CustomerInput> | undefined {
  const trimmed = query.trim();
  if (!trimmed) return undefined;
  const digitsOnly = trimmed.replace(/[\s.-]/g, "");
  const looksLikePhone = /^\d{6,}$/.test(digitsOnly);
  return looksLikePhone ? { phone: digitsOnly } : { name: trimmed };
}
