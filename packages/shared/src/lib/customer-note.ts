// A d-m-y or d/m/y date, 1-2 digit day/month, 2 or 4 digit year (e.g. "30-9-26" or "30/09/2026").
const DATE_IN_NOTE_RE = /\b(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})\b/g;

export const CUSTOMER_NOTE_MIN_LENGTH = 50;

// A customer note only counts as "done" for a given sale day when it's both substantial (so a one-word
// note can never pass) and freshly dated to that day — a note left over from the customer's last visit
// must not silently satisfy today's requirement. This matches the shop's own convention of starting the
// note with "Tên nhân viên - Tên cơ sở - ngày/tháng/năm", e.g. "Chiến - CS3 - 30-9-26", but any note that
// happens to mention that day's date somewhere and is long enough also counts — the exact wording isn't
// enforced, only that it's long enough and dated to the right day.
export function hasValidCustomerNoteForDate(note: string | null | undefined, date: Date): boolean {
  if (!note || note.trim().length < CUSTOMER_NOTE_MIN_LENGTH) return false;
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  const shortYear = year % 100;
  for (const m of note.matchAll(DATE_IN_NOTE_RE)) {
    const d = Number(m[1]);
    const mo = Number(m[2]);
    const y = Number(m[3]);
    if (d === day && mo === month && (y === year || y === shortYear)) return true;
  }
  return false;
}
