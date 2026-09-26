export type PeriodPreset =
  | "today"
  | "yesterday"
  | "this_week"
  | "last_week"
  | "last_7_days"
  | "last_30_days"
  | "this_month"
  | "last_month"
  | "this_quarter"
  | "last_quarter"
  | "this_year"
  | "last_year"
  | "all_time"
  | "custom";

// The one list every period dropdown offers, so they all match. Quarter / all-time presets still
// resolve to a range (see getPeriodRange) but are no longer offered; use "Tùy chỉnh" instead.
export const PERIOD_PRESET_OPTIONS: { value: PeriodPreset; label: string }[] = [
  { value: "today", label: "Hôm nay" },
  { value: "yesterday", label: "Hôm qua" },
  { value: "this_week", label: "Tuần này" },
  { value: "last_week", label: "Tuần trước" },
  { value: "last_7_days", label: "7 ngày qua" },
  { value: "last_30_days", label: "30 ngày qua" },
  { value: "this_month", label: "Tháng này" },
  { value: "last_month", label: "Tháng trước" },
  { value: "this_year", label: "Năm này" },
  { value: "last_year", label: "Năm trước" },
  { value: "custom", label: "Tùy chỉnh" },
];

export const PERIOD_PRESET_LABELS: Record<PeriodPreset, string> = {
  ...(Object.fromEntries(PERIOD_PRESET_OPTIONS.map((o) => [o.value, o.label])) as Record<PeriodPreset, string>),
  this_quarter: "Quý này",
  last_quarter: "Quý trước",
  all_time: "Tất cả thời gian",
};

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function endOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

// Weeks start on Monday (Vietnamese convention), not Sunday.
function mondayOf(d: Date) {
  const offset = (d.getDay() + 6) % 7;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - offset);
}

function daysAgo(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - n);
}

function quarterStartMonth(month: number) {
  return Math.floor(month / 3) * 3;
}

export function getPeriodRange(
  preset: PeriodPreset,
  custom?: { from: string; to: string },
): { from: Date; to: Date } {
  const now = new Date();

  switch (preset) {
    case "today":
      return { from: startOfDay(now), to: endOfDay(now) };

    case "yesterday": {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      return { from: startOfDay(y), to: endOfDay(y) };
    }

    case "this_week": {
      const from = mondayOf(now);
      return { from, to: endOfDay(now) };
    }

    case "last_week": {
      const thisMonday = mondayOf(now);
      const from = new Date(thisMonday.getFullYear(), thisMonday.getMonth(), thisMonday.getDate() - 7);
      const to = new Date(thisMonday.getTime() - 1);
      return { from, to };
    }

    case "last_7_days":
      return { from: startOfDay(daysAgo(now, 6)), to: endOfDay(now) };

    case "last_30_days":
      return { from: startOfDay(daysAgo(now, 29)), to: endOfDay(now) };

    case "all_time":
      return { from: new Date(2000, 0, 1), to: endOfDay(now) };

    case "this_month":
      return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: endOfDay(now) };

    case "last_month": {
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const to = new Date(thisMonthStart.getTime() - 1);
      const from = new Date(to.getFullYear(), to.getMonth(), 1);
      return { from, to };
    }

    case "this_quarter":
      return { from: new Date(now.getFullYear(), quarterStartMonth(now.getMonth()), 1), to: endOfDay(now) };

    case "last_quarter": {
      const thisQuarterStart = new Date(now.getFullYear(), quarterStartMonth(now.getMonth()), 1);
      const to = new Date(thisQuarterStart.getTime() - 1);
      const from = new Date(to.getFullYear(), quarterStartMonth(to.getMonth()), 1);
      return { from, to };
    }

    case "this_year":
      return { from: new Date(now.getFullYear(), 0, 1), to: endOfDay(now) };

    case "last_year": {
      const thisYearStart = new Date(now.getFullYear(), 0, 1);
      const to = new Date(thisYearStart.getTime() - 1);
      const from = new Date(to.getFullYear(), 0, 1);
      return { from, to };
    }

    case "custom": {
      if (custom?.from && custom?.to) {
        return { from: startOfDay(new Date(custom.from)), to: endOfDay(new Date(custom.to)) };
      }
      return { from: startOfDay(now), to: endOfDay(now) };
    }
  }
}

export function formatPeriodLabel(preset: PeriodPreset, range: { from: Date; to: Date }): string {
  if (preset !== "custom") return PERIOD_PRESET_LABELS[preset];
  const fmt = (d: Date) => d.toLocaleDateString("vi-VN");
  return `${fmt(range.from)} - ${fmt(range.to)}`;
}
