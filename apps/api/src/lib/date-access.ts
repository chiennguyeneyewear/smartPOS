import { ROLES } from "@smartpos/shared";

const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
export const vnDayOf = (d: Date) => new Date(d.getTime() + VN_OFFSET_MS).toISOString().slice(0, 10);

function addDays(day: string, delta: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

export function vnToday(): string {
  return vnDayOf(new Date());
}

export function vnYesterday(): string {
  return addDays(vnToday(), -1);
}

// "15 ngày gần nhất": today and the 14 days before it.
export const RECENT_WINDOW_DAYS = 15;

export function vnRecentWindowStart(): string {
  return addDays(vnToday(), -(RECENT_WINDOW_DAYS - 1));
}

export class DateAccessError extends Error {
  statusCode = 403;
  constructor(message = "Bạn chỉ được xem dữ liệu trong 15 ngày gần nhất") {
    super(message);
    this.name = "DateAccessError";
  }
}

// Đơn hàng, Chi tiêu và Tờ thu chi: non-admin accounts only ever see the last 15 days (today included,
// Vietnam time); the admin sees everything. Throws when a non-admin's request falls outside that window.
export function assertRecentDay(date: string, role: string): void {
  if (role === ROLES.ADMIN) return;
  const today = vnToday();
  const start = vnRecentWindowStart();
  if (date < start || date > today) throw new DateAccessError();
}

// Same rule for a from/to range (the Đơn hàng invoice list): clamps rather than rejects, so a wider preset
// picked before the account's role loaded doesn't hard-error — it just silently narrows to what's allowed.
export function clampRecentRange(role: string, from?: string, to?: string): { from?: string; to?: string } {
  if (role === ROLES.ADMIN) return { from, to };
  const earliest = new Date(`${vnRecentWindowStart()}T00:00:00+07:00`).toISOString();
  const clampedFrom = !from || from < earliest ? earliest : from;
  return { from: clampedFrom, to };
}
