export type LineDiscountType = "AMOUNT" | "PERCENT";

/**
 * Single source of truth for per-line discount math, shared by the POS cart
 * (frontend) and invoice persistence (backend) so the two never compute a
 * different total for the same inputs. The unit discount is always clamped
 * to [0, unitPrice] so a mistyped discount can never make a line (or the
 * invoice it belongs to) negative.
 */
export function computeLineUnitDiscount(
  unitPrice: number,
  discountType: LineDiscountType,
  discountValue: number,
): number {
  const raw =
    discountType === "PERCENT" ? Math.round((unitPrice * discountValue) / 100) : discountValue;
  return Math.min(Math.max(0, raw), unitPrice);
}

export function computeLineSellPrice(
  unitPrice: number,
  discountType: LineDiscountType,
  discountValue: number,
): number {
  return unitPrice - computeLineUnitDiscount(unitPrice, discountType, discountValue);
}

export function computeLineTotal(
  unitPrice: number,
  quantity: number,
  discountType: LineDiscountType,
  discountValue: number,
): number {
  return computeLineSellPrice(unitPrice, discountType, discountValue) * quantity;
}

/**
 * Clamps a flat per-line discount amount (the wire/DB representation) to
 * what that line could actually be discounted by, given its quantity and
 * unit price. Used as a defense-in-depth check wherever a client-computed
 * discount amount is persisted, in case the client-side clamp is bypassed.
 */
export function clampFlatLineDiscount(discount: number, quantity: number, unitPrice: number): number {
  return Math.min(Math.max(0, discount), quantity * unitPrice);
}
