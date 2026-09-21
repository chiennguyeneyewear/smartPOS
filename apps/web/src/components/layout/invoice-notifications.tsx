import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { fetchInvoices, type InvoiceListItem } from "@/features/sales/api";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "@/stores/toast-store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const POLL_INTERVAL_MS = 20_000;
const MAX_ITEMS = 30;

function formatNumber(value: number): string {
  return value.toLocaleString("en-US");
}

function timeAgo(iso: string): string {
  const diffSec = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (diffSec < 60) return "vừa xong";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} phút trước`;
  return `${Math.floor(diffSec / 3600)} giờ trước`;
}

// Polls completed invoices across all branches and toasts/badges the ones this
// tab hasn't seen yet — keyed by invoice id rather than a "since" timestamp,
// because a draft started before the last poll can complete well after it
// (a customer browsing at the counter), so a timestamp cutoff would silently
// drop that notification.
export function InvoiceNotifications() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === "admin";
  const seenIdsRef = useRef<Set<string> | null>(null);
  const [items, setItems] = useState<InvoiceListItem[]>([]);
  const [unread, setUnread] = useState(0);

  const { data } = useQuery({
    queryKey: ["invoice-notifications-poll"],
    queryFn: () => fetchInvoices({ status: "COMPLETED" }),
    enabled: isAdmin,
    refetchInterval: POLL_INTERVAL_MS,
    refetchIntervalInBackground: true,
  });

  useEffect(() => {
    if (!data) return;
    if (seenIdsRef.current === null) {
      // First load: record the current state as the baseline, don't toast for
      // invoices that already existed before this tab started watching.
      seenIdsRef.current = new Set(data.map((inv) => inv.id));
      return;
    }
    const seen = seenIdsRef.current;
    const fresh = data.filter((inv) => !seen.has(inv.id));
    if (fresh.length === 0) return;

    fresh.forEach((inv) => {
      seen.add(inv.id);
      toast({
        title: `Hóa đơn mới: ${inv.code}`,
        description: `${inv.createdByName} · ${formatNumber(inv.totalAmount)} đ`,
      });
    });
    setItems((prev) => [...fresh, ...prev].slice(0, MAX_ITEMS));
    setUnread((n) => n + fresh.length);
  }, [data]);

  if (!isAdmin) return null;

  return (
    <DropdownMenu onOpenChange={(open) => open && setUnread(0)}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <Badge
              variant="destructive"
              className="absolute -right-1 -top-1 h-4 min-w-4 justify-center px-1 text-[10px]"
            >
              {unread > 9 ? "9+" : unread}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Hóa đơn mới</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.length === 0 && (
          <div className="p-3 text-center text-sm text-muted-foreground">Chưa có hóa đơn mới</div>
        )}
        {items.map((inv) => (
          <DropdownMenuItem key={inv.id} className="flex flex-col items-start gap-0.5">
            <span className="font-medium">
              {inv.code} — {formatNumber(inv.totalAmount)} đ
            </span>
            <span className="text-xs text-muted-foreground">
              {inv.createdByName} · {timeAgo(inv.completedAt ?? inv.createdAt)}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
