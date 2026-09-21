import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { fetchInvoices, type InvoiceListItem } from "@/features/sales/api";
import { useAuthStore } from "@/stores/auth-store";
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
const MAX_ITEMS = 15;

function formatNumber(value: number): string {
  return value.toLocaleString("en-US");
}

function timeAgo(iso: string): string {
  const diffSec = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (diffSec < 60) return "vừa xong";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} phút trước`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} giờ trước`;
  return `${Math.floor(diffSec / 86400)} ngày trước`;
}

// "Hoạt động gần đây": a quiet activity feed of completed sales across all 3
// branches, badge-only (no toast popups — the earlier toast version was
// explicitly rejected as too intrusive). Dedup is by invoice id, not a
// "since" timestamp, because a draft started before the last poll can be
// checked out well after it.
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
      // Baseline on first load: seed the feed with what already happened
      // recently, but don't count it as "unread".
      seenIdsRef.current = new Set(data.map((inv) => inv.id));
      setItems(data.slice(0, MAX_ITEMS));
      return;
    }
    const seen = seenIdsRef.current;
    const fresh = data.filter((inv) => !seen.has(inv.id));
    if (fresh.length === 0) return;

    fresh.forEach((inv) => seen.add(inv.id));
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
              className="absolute -right-1 -top-1 h-4 min-w-4 justify-center rounded-full px-1 text-[10px]"
            >
              {unread > 9 ? "9+" : unread}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Hoạt động gần đây</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.length === 0 && (
          <div className="p-3 text-center text-sm text-muted-foreground">Chưa có hoạt động nào</div>
        )}
        {items.map((inv) => (
          <DropdownMenuItem key={inv.id} className="flex flex-col items-start gap-0.5">
            <span className="text-sm">
              <span className="font-medium text-primary">{inv.createdByName}</span> vừa bán đơn hàng với giá trị{" "}
              <span className="font-medium">{formatNumber(inv.totalAmount)}</span>
            </span>
            <span className="text-xs text-muted-foreground">{timeAgo(inv.completedAt ?? inv.createdAt)}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
