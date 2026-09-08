export type PeriodPreset =
  | "today"
  | "yesterday"
  | "this_month"
  | "last_month"
  | "this_quarter"
  | "last_quarter"
  | "this_year"
  | "last_year"
  | "custom";

export const PERIOD_PRESET_OPTIONS: { value: PeriodPreset; label: string }[] = [
  { value: "today", label: "Hôm nay" },
  { value: "yesterday", label: "Hôm qua" },
  { value: "this_month", label: "Tháng này" },
  { value: "last_month", label: "Tháng trước" },
  { value: "this_quarter", label: "Quý này" },
  { value: "last_quarter", label: "Quý trước" },
  { value: "this_year", label: "Năm này" },
  { value: "last_year", label: "Năm trước" },
  { value: "custom", label: "Tùy chỉnh" },
];

export const PERIOD_PRESET_LABELS: Record<PeriodPreset, string> = Object.fromEntries(
  PERIOD_PRESET_OPTIONS.map((o) => [o.value, o.label]),
) as Record<PeriodPreset, string>;

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function endOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
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
