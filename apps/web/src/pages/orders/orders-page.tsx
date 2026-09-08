import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/shared/date-picker";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { PERIOD_PRESET_OPTIONS, formatPeriodLabel, getPeriodRange, type PeriodPreset } from "@/lib/period-presets";
import { useAuthStore } from "@/stores/auth-store";
import { useInvoices } from "@/features/sales/hooks";
import type { InvoiceListItem } from "@/features/sales/api";
import { useUsers } from "@/features/users/hooks";

function toDateInputValue(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const columns: ColumnDef<InvoiceListItem, any>[] = [
  { accessorKey: "code", header: "Mã hóa đơn" },
  {
    id: "createdAt",
    header: "Thời gian",
    cell: ({ row }) => formatDateTime(row.original.createdAt),
  },
  {
    id: "customerCode",
    header: "Mã khách hàng",
    cell: ({ row }) => row.original.customer?.code ?? "",
  },
  {
    id: "customerName",
    header: "Khách hàng",
    cell: ({ row }) => row.original.customer?.name ?? "Khách lẻ",
  },
  {
    id: "customerPhone",
    header: "Số điện thoại",
    cell: ({ row }) => row.original.customer?.phone ?? "",
  },
  { accessorKey: "createdByName", header: "Người bán" },
  {
    id: "status",
    header: "Trạng thái",
    cell: ({ row }) =>
      row.original.status === "CANCELLED" ? (
        <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
          Đã hủy
        </span>
      ) : (
        <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
          Hoàn thành
        </span>
      ),
  },
  {
    id: "totalAmount",
    header: "Tổng tiền hàng",
    cell: ({ row }) => <span className="font-medium">{formatCurrency(row.original.totalAmount)}</span>,
  },
];

export function OrdersPage() {
  const activeBranchId = useAuthStore((s) => s.activeBranchId);
  const [preset, setPreset] = useState<PeriodPreset>("this_month");
  const [customFrom, setCustomFrom] = useState(() => toDateInputValue(new Date()));
  const [customTo, setCustomTo] = useState(() => toDateInputValue(new Date()));
  const [sellerId, setSellerId] = useState<string>("all");
  const [showCompleted, setShowCompleted] = useState(true);
  const [showCancelled, setShowCancelled] = useState(true);

  const range = useMemo(
    () => getPeriodRange(preset, { from: customFrom, to: customTo }),
    [preset, customFrom, customTo],
  );
  const periodLabel = formatPeriodLabel(preset, range);

  const { data: sellers } = useUsers();
  const { data: invoices, isLoading } = useInvoices({
    branchId: activeBranchId ?? undefined,
    createdById: sellerId === "all" ? undefined : sellerId,
    from: range.from.toISOString(),
    to: range.to.toISOString(),
  });

  const filteredInvoices = useMemo(
    () =>
      (invoices ?? []).filter(
        (inv) =>
          (inv.status === "COMPLETED" && showCompleted) || (inv.status === "CANCELLED" && showCancelled),
      ),
    [invoices, showCompleted, showCancelled],
  );

  const total = useMemo(
    () => filteredInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0),
    [filteredInvoices],
  );

  return (
    <div className="space-y-4">
      <PageHeader title="Đơn hàng" description="Toàn bộ hóa đơn đã tạo" />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[240px_1fr]">
        <Card className="h-fit">
          <CardContent className="space-y-4 pt-4">
            <div className="space-y-2">
              <p className="text-sm font-semibold">Thời gian</p>
              <Select value={preset} onValueChange={(v) => setPreset(v as PeriodPreset)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERIOD_PRESET_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {preset === "custom" && (
                <div className="space-y-2">
                  <DatePicker value={customFrom} onChange={setCustomFrom} className="w-full" />
                  <DatePicker value={customTo} onChange={setCustomTo} className="w-full" />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold">Người bán</p>
              <Select value={sellerId} onValueChange={setSellerId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  {sellers?.map((seller) => (
                    <SelectItem key={seller.id} value={seller.id}>
                      {seller.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold">Trạng thái hóa đơn</p>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={showCompleted}
                  onChange={(e) => setShowCompleted(e.target.checked)}
                />
                Hoàn thành
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={showCancelled}
                  onChange={(e) => setShowCancelled(e.target.checked)}
                />
                Đã hủy
              </label>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
            <span>{periodLabel}</span>
            <span>
              {filteredInvoices.length} hóa đơn · Tổng{" "}
              <span className="font-semibold text-foreground">{formatCurrency(total)}</span>
            </span>
          </div>
          <DataTable
            columns={columns}
            data={filteredInvoices}
            isLoading={isLoading}
            emptyMessage="Không có hóa đơn nào"
          />
        </div>
      </div>
    </div>
  );
}
