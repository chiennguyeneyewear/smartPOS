import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

// One shared 1-second ticker for every countdown on the page, instead of a timer per row.
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!timer) timer = setInterval(() => listeners.forEach((l) => l()), 1000);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

function useNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => subscribe(() => setNow(Date.now())), []);
  return now;
}

const pad = (n: number) => String(n).padStart(2, "0");

// "2 ngày 3 giờ", "1 giờ 05 phút", "12 phút 30 giây": the two most useful units for the size.
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  if (days > 0) return `${days} ngày ${hours} giờ`;
  if (hours > 0) return `${hours} giờ ${pad(minutes)} phút`;
  return `${minutes} phút ${pad(seconds)} giây`;
}

// Counts down to the deadline while the task is open; once it is done, freezes into
// whether it finished on time so the number stops moving.
export function Countdown({
  dueAt,
  done,
  completedAt,
}: {
  dueAt: string | null;
  done: boolean;
  completedAt: string | null;
}) {
  const now = useNow();
  if (!dueAt) return <span className="text-muted-foreground">Không có hạn</span>;

  const due = new Date(dueAt).getTime();

  if (done) {
    const finished = completedAt ? new Date(completedAt).getTime() : now;
    const late = finished - due;
    return late > 0 ? (
      <span className="font-medium text-destructive">Xong trễ {formatDuration(late)}</span>
    ) : (
      <span className="font-medium text-success">Xong đúng hạn</span>
    );
  }

  const remaining = due - now;
  if (remaining <= 0) {
    return <span className="font-semibold text-destructive">Quá hạn {formatDuration(-remaining)}</span>;
  }
  return (
    <span
      className={cn(
        "font-semibold tabular-nums",
        remaining < 3_600_000 ? "text-destructive" : remaining < 86_400_000 ? "text-amber-600" : "text-success",
      )}
    >
      Còn {formatDuration(remaining)}
    </span>
  );
}
