import { useEffect, useRef, useState } from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface DatePickerProps {
  value: string; // yyyy-mm-dd
  onChange: (value: string) => void;
  className?: string;
}

const WEEKDAY_LABELS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const MONTH_LABELS = Array.from({ length: 12 }, (_, i) => `Tháng ${i + 1}`);

function parseValue(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y || new Date().getFullYear(), (m || 1) - 1, d || 1);
}

function toValue(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDisplay(d: Date): string {
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// Self-built calendar dropdown (no native <input type="date">) so the
// picker's labels and dd/mm/yyyy format are always Vietnamese, regardless
// of the visitor's browser/OS locale.
export function DatePicker({ value, onChange, className }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const selected = parseValue(value);
  const [viewYear, setViewYear] = useState(selected.getFullYear());
  const [viewMonth, setViewMonth] = useState(selected.getMonth());
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);

    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
  }, [open]);

  function openNow() {
    setViewYear(selected.getFullYear());
    setViewMonth(selected.getMonth());
    setOpen(true);
  }

  function goPrevMonth() {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function goNextMonth() {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  const firstOfMonth = new Date(viewYear, viewMonth, 1);
  const startWeekday = firstOfMonth.getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array.from({ length: startWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(viewYear, viewMonth, i + 1)),
  ];

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : openNow())}
        className="flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
      >
        {formatDisplay(selected)}
        <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 w-64 rounded-md border bg-popover p-3 shadow-lg">
          <div className="mb-2 flex items-center justify-between">
            <button type="button" onClick={goPrevMonth} className="rounded p-1 hover:bg-muted">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-medium">
              {MONTH_LABELS[viewMonth]} {viewYear}
            </span>
            <button type="button" onClick={goNextMonth} className="rounded p-1 hover:bg-muted">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
            {WEEKDAY_LABELS.map((w) => (
              <div key={w} className="py-1 font-medium">
                {w}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-sm">
            {cells.map((d, i) =>
              d ? (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    onChange(toValue(d));
                    setOpen(false);
                  }}
                  className={cn(
                    "rounded py-1 hover:bg-muted",
                    isSameDay(d, selected) && "bg-primary text-primary-foreground hover:bg-primary",
                  )}
                >
                  {d.getDate()}
                </button>
              ) : (
                <div key={i} />
              ),
            )}
          </div>
        </div>
      )}
    </div>
  );
}
