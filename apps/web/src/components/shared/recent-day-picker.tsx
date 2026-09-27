import { useState } from "react";
import { DatePicker } from "@/components/shared/date-picker";
import { cn } from "@/lib/utils";

const RECENT_WINDOW_DAYS = 15;
const todayVn = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
function addDays(day: string, delta: number) {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}
const formatVn = (day: string) => day.split("-").reverse().join("/");

// Đơn hàng, Chi tiêu và Tờ thu chi: non-admin accounts only ever look at the last 15 days (today included,
// Vietnam time; the server enforces the same limit). Hôm nay / Hôm qua are one click; Tùy chỉnh opens a
// calendar where days outside that window can't be picked. Admin gets the normal date picker, unrestricted.
export function RecentDayPicker({
  value,
  onChange,
  isAdmin,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  isAdmin: boolean;
  className?: string;
}) {
  const [customOpen, setCustomOpen] = useState(false);
  if (isAdmin) return <DatePicker value={value} onChange={onChange} className={className} />;

  const today = todayVn();
  const yesterday = addDays(today, -1);
  const windowStart = addDays(today, -(RECENT_WINDOW_DAYS - 1));
  const isCustomValue = value !== today && value !== yesterday;
  const showCalendar = customOpen || isCustomValue;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex gap-2">
        {[
          { day: today, label: "Hôm nay" },
          { day: yesterday, label: "Hôm qua" },
        ].map((opt) => (
          <button
            key={opt.day}
            type="button"
            onClick={() => {
              setCustomOpen(false);
              onChange(opt.day);
            }}
            className={cn(
              "h-9 flex-1 rounded-md border px-3 text-sm transition-colors",
              value === opt.day
                ? "border-primary bg-primary/10 font-medium text-primary"
                : "border-input text-muted-foreground hover:bg-accent",
            )}
          >
            {opt.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setCustomOpen((v) => !v)}
          className={cn(
            "h-9 flex-1 rounded-md border px-3 text-sm transition-colors",
            showCalendar
              ? "border-primary bg-primary/10 font-medium text-primary"
              : "border-input text-muted-foreground hover:bg-accent",
          )}
        >
          {isCustomValue ? formatVn(value) : "Tùy chỉnh"}
        </button>
      </div>
      {showCalendar && (
        <DatePicker value={value} onChange={onChange} minDate={windowStart} maxDate={today} className="w-full" />
      )}
    </div>
  );
}
