import { DatePicker } from "@/components/shared/date-picker";
import { cn } from "@/lib/utils";

const todayVn = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
function addDays(day: string, delta: number) {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

// Đơn hàng, Chi tiêu và Tờ thu chi: non-admin accounts only ever look at today and yesterday, so they get
// two buttons instead of a full calendar (the server enforces the same limit either way). Admin gets the
// normal date picker.
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
  if (isAdmin) return <DatePicker value={value} onChange={onChange} className={className} />;

  const today = todayVn();
  const yesterday = addDays(today, -1);
  return (
    <div className={cn("flex gap-2", className)}>
      {[
        { day: today, label: "Hôm nay" },
        { day: yesterday, label: "Hôm qua" },
      ].map((opt) => (
        <button
          key={opt.day}
          type="button"
          onClick={() => onChange(opt.day)}
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
    </div>
  );
}
