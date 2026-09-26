import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Ban, Search, SlidersHorizontal } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/shared/date-picker";
import { PrintReceiptDialog } from "@/components/shared/print-receipt-dialog";
import { InvoiceDetailPanel, goodsTotal } from "./invoice-detail-panel";
import { useSearchDropdown } from "@/hooks/use-search-dropdown";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { PERIOD_PRESET_OPTIONS, formatPeriodLabel, getPeriodRange, type PeriodPreset } from "@/lib/period-presets";
import { useReportBranchId } from "@/hooks/use-report-branch-id";
import { mergeSameProductItems, type ReceiptData } from "@/stores/print-receipt-store";
import { usePrintSettingsStore } from "@/stores/print-settings-store";
import { useInvoices, useVoidInvoices } from "@/features/sales/hooks";
import type { InvoiceListItem } from "@/features/sales/api";
import { useUsers } from "@/features/users/hooks";
import { useAuthStore } from "@/stores/auth-store";
import { useBranches } from "@/features/branches/hooks";

type PayMethod = "CASH" | "BANK_TRANSFER" | "CARD" | "DEBT";
const PAY_METHODS: { value: PayMethod; label: string }[] = [
  { value: "CASH", label: "Tiền mặt" },
  { value: "BANK_TRANSFER", label: "Chuyển khoản" },
  { value: "CARD", label: "Quẹt thẻ" },
  { value: "DEBT", label: "Ghi nợ" },
];
const PAY_LABEL = Object.fromEntries(PAY_METHODS.map((m) => [m.value, m.label])) as Record<PayMethod, string>;

function toDateInputValue(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function OrdersPage() {
  const reportBranchId = useReportBranchId();
  const mergeSameItems = usePrintSettingsStore((s) => s.mergeSameItems);
  const [preset, setPreset] = useState<PeriodPreset>("this_month");
  const [customFrom, setCustomFrom] = useState(() => toDateInputValue(new Date()));
  const [customTo, setCustomTo] = useState(() => toDateInputValue(new Date()));
  const [sellerId, setSellerId] = useState<string>("all");
  const [payMethods, setPayMethods] = useState<Set<PayMethod>>(new Set(PAY_METHODS.map((m) => m.value)));
  const [showCompleted, setShowCompleted] = useState(true);
  const [showCancelled, setShowCancelled] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmingVoid, setConfirmingVoid] = useState(false);
  const [printInvoice, setPrintInvoice] = useState<InvoiceListItem | null>(null);
  const [codeQuery, setCodeQuery] = useState("");
  const [productQuery, setProductQuery] = useState("");
  const [customerQuery, setCustomerQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState({ code: "", product: "", customer: "" });
  const { open: searchOpen, openNow: openSearch, closeSoon: closeSearchSoon, closeNow: closeSearchNow } =
    useSearchDropdown();

  const range = useMemo(
    () => getPeriodRange(preset, { from: customFrom, to: customTo }),
    [preset, customFrom, customTo],
  );
  const periodLabel = formatPeriodLabel(preset, range);

  const isAdmin = useAuthStore((s) => s.user?.role === "admin");
  // Only the admin can look at other people's invoices; everyone else is limited to their own by the API.
  const { data: sellers } = useUsers({ enabled: isAdmin });
  const { data: branches } = useBranches();
  const { data: invoices, isLoading } = useInvoices({
    branchId: reportBranchId,
    createdById: isAdmin && sellerId !== "all" ? sellerId : undefined,
    from: range.from.toISOString(),
    to: range.to.toISOString(),
  });

  const filteredInvoices = useMemo(() => {
    const codeQ = appliedQuery.code.trim().toLowerCase();
    const productQ = appliedQuery.product.trim().toLowerCase();
    const customerQ = appliedQuery.customer.trim().toLowerCase();

    return (invoices ?? []).filter((inv) => {
      if (!((inv.status === "COMPLETED" && showCompleted) || (inv.status === "CANCELLED" && showCancelled))) {
        return false;
      }
      // Payment-method filter only bites when at least one method is unticked.
      if (payMethods.size < PAY_METHODS.length && !inv.payments.some((p) => payMethods.has(p.method))) return false;
      if (codeQ && !inv.code.toLowerCase().includes(codeQ)) return false;
      if (
        productQ &&
        !inv.items.some(
          (item) =>
            item.product.name.toLowerCase().includes(productQ) ||
            item.product.sku.toLowerCase().includes(productQ),
        )
      ) {
        return false;
      }
      if (customerQ) {
        const c = inv.customer;
        const matches =
          !!c &&
          (c.name.toLowerCase().includes(customerQ) ||
            c.code.toLowerCase().includes(customerQ) ||
            (c.phone ?? "").includes(customerQ));
        if (!matches) return false;
      }
      return true;
    });
  }, [invoices, showCompleted, showCancelled, appliedQuery, payMethods]);

  // How much of the listed (completed) invoices was paid by each method.
  const byMethod = useMemo(() => {
    const sums = new Map<PayMethod, number>();
    for (const inv of filteredInvoices) {
      if (inv.status !== "COMPLETED") continue;
      for (const p of inv.payments) sums.set(p.method, (sums.get(p.method) ?? 0) + p.amount);
    }
    return PAY_METHODS.filter((m) => sums.has(m.value)).map((m) => ({ ...m, amount: sums.get(m.value) ?? 0 }));
  }, [filteredInvoices]);

  function togglePayMethod(method: PayMethod) {
    setPayMethods((prev) => {
      const next = new Set(prev);
      if (next.has(method)) next.delete(method);
      else next.add(method);
      return next;
    });
  }

  function applySearch() {
    setAppliedQuery({ code: codeQuery, product: productQuery, customer: customerQuery });
    closeSearchNow();
  }

  const total = useMemo(
    () => filteredInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0),
    [filteredInvoices],
  );

  const allSelected = filteredInvoices.length > 0 && filteredInvoices.every((inv) => selectedIds.has(inv.id));

  function toggleOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelectedIds((prev) => {
      if (allSelected) return new Set();
      return new Set(filteredInvoices.map((inv) => inv.id));
    });
  }

  function buildReceiptData(inv: InvoiceListItem): ReceiptData {
    let items = inv.items.map((item) => ({
      productId: item.productId,
      name: item.product.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discount: item.discount,
      lineTotal: item.lineTotal,
    }));
    if (mergeSameItems) items = mergeSameProductItems(items);

    const branch = branches?.find((b) => b.id === inv.branchId);

    return {
      storeName: branch?.name ?? "SmartPOS",
      storeAddress: branch?.address,
      storePhone: branch?.phone,
      code: inv.code,
      date: inv.completedAt ?? inv.createdAt,
      cashierName: inv.createdByName,
      customerName: inv.customer?.name,
      customerPhone: inv.customer?.phone,
      items,
      subTotal: inv.subTotal,
      discountAmount: inv.discountAmount,
      totalAmount: inv.totalAmount,
      payments: inv.payments,
    };
  }

  const voidInvoices = useVoidInvoices();

  function confirmVoid() {
    voidInvoices.mutate([...selectedIds], {
      onSuccess: () => {
        setSelectedIds(new Set());
        setConfirmingVoid(false);
      },
    });
  }

  const columns: ColumnDef<InvoiceListItem, any>[] = [
    {
      id: "select",
      header: () => <input type="checkbox" checked={allSelected} onChange={toggleAll} />,
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={selectedIds.has(row.original.id)}
          onClick={(e) => e.stopPropagation()}
          onChange={() => toggleOne(row.original.id)}
        />
      ),
    },
    { accessorKey: "code", header: "Mã hóa đơn" },
    {
      id: "createdAt",
      header: "Thời gian",
      cell: ({ row }) => formatDateTime(row.original.createdAt),
    },
    {
      id: "customer",
      header: "Khách hàng",
      cell: ({ row }) => (
        <div className="min-w-[140px] max-w-[220px] whitespace-normal leading-tight">
          <p className="font-medium">{row.original.customer?.name ?? "Khách lẻ"}</p>
          {row.original.customer?.code && (
            <p className="mt-0.5 text-xs text-muted-foreground">{row.original.customer.code}</p>
          )}
        </div>
      ),
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
      id: "subTotal",
      header: "Tổng tiền hàng",
      cell: ({ row }) => <span className="tabular-nums">{goodsTotal(row.original).toLocaleString("en-US")}</span>,
    },
    {
      id: "paymentMethod",
      header: "Phương thức thanh toán",
      cell: ({ row }) => {
        const methods = [...new Set(row.original.payments.map((p) => p.method))];
        return methods.length > 0 ? methods.map((m) => PAY_LABEL[m] ?? m).join(" + ") : "";
      },
    },
    {
      id: "paidAmount",
      header: "Khách đã trả",
      cell: ({ row }) => (
        <span className="font-medium tabular-nums">{row.original.paidAmount.toLocaleString("en-US")}</span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader title="Đơn hàng" description="Toàn bộ hóa đơn đã tạo" />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[195px_1fr]">
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

            {isAdmin && (
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
            )}

            <div className="space-y-2">
              <p className="text-sm font-semibold leading-tight">Phương thức thanh toán</p>
              {PAY_METHODS.map((m) => (
                <label key={m.value} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={payMethods.has(m.value)} onChange={() => togglePayMethod(m.value)} />
                  {m.label}
                </label>
              ))}
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

        <div className="min-w-0 space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={codeQuery}
              onChange={(e) => setCodeQuery(e.target.value)}
              onFocus={openSearch}
              onBlur={() => closeSearchSoon()}
              onKeyDown={(e) => e.key === "Enter" && applySearch()}
              placeholder="Theo mã hóa đơn"
              className="h-10 pl-9 pr-10"
            />
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => (searchOpen ? closeSearchNow() : openSearch())}
              className="absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded text-muted-foreground hover:bg-accent"
            >
              <SlidersHorizontal className="h-4 w-4" />
            </button>

            {searchOpen && (
              <div className="absolute left-0 top-full z-30 mt-1 w-full min-w-[320px] space-y-2 rounded-md border bg-popover p-3 shadow-lg">
                <Input
                  value={codeQuery}
                  onChange={(e) => setCodeQuery(e.target.value)}
                  onFocus={openSearch}
                  onBlur={() => closeSearchSoon()}
                  onKeyDown={(e) => e.key === "Enter" && applySearch()}
                  placeholder="Theo mã hóa đơn"
                />
                <Input
                  value={productQuery}
                  onChange={(e) => setProductQuery(e.target.value)}
                  onFocus={openSearch}
                  onBlur={() => closeSearchSoon()}
                  onKeyDown={(e) => e.key === "Enter" && applySearch()}
                  placeholder="Theo mã, tên hàng"
                />
                <Input
                  value={customerQuery}
                  onChange={(e) => setCustomerQuery(e.target.value)}
                  onFocus={openSearch}
                  onBlur={() => closeSearchSoon()}
                  onKeyDown={(e) => e.key === "Enter" && applySearch()}
                  placeholder="Theo mã, tên, số điện thoại khách hàng"
                />
                <div className="flex justify-end gap-2 pt-1">
                  <Button variant="outline" size="sm" onMouseDown={(e) => e.preventDefault()} onClick={closeSearchNow}>
                    Mở rộng
                  </Button>
                  <Button size="sm" onMouseDown={(e) => e.preventDefault()} onClick={applySearch}>
                    Tìm kiếm
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
            <span className="flex flex-wrap items-center gap-x-3">
              <span>{periodLabel}</span>
              {byMethod.map((m) => (
                <span key={m.value}>
                  {m.label}: <span className="font-medium text-foreground">{formatCurrency(m.amount)}</span>
                </span>
              ))}
            </span>
            <div className="flex items-center gap-3">
              {isAdmin && selectedIds.size > 0 && (
                <Button variant="destructive" size="sm" onClick={() => setConfirmingVoid(true)}>
                  <Ban className="mr-1.5 h-4 w-4" />
                  Hủy đơn ({selectedIds.size})
                </Button>
              )}
              <span>
                {filteredInvoices.length} hóa đơn · Tổng{" "}
                <span className="font-semibold text-foreground">{formatCurrency(total)}</span>
              </span>
            </div>
          </div>
          <DataTable
            columns={isAdmin ? columns : columns.filter((c) => c.id !== "select")}
            compact
            data={filteredInvoices}
            isLoading={isLoading}
            emptyMessage="Không có hóa đơn nào"
            onRowClick={(row) => setExpandedId((prev) => (prev === row.id ? null : row.id))}
            isRowSelected={(row) => row.id === expandedId}
            renderExpandedRow={(row) => (
              <InvoiceDetailPanel
                invoice={row}
                branchName={branches?.find((b) => b.id === row.branchId)?.name}
                onPrint={() => setPrintInvoice(row)}
                onVoid={
                  isAdmin
                    ? () => {
                        setSelectedIds(new Set([row.id]));
                        setConfirmingVoid(true);
                      }
                    : undefined
                }
              />
            )}
          />
        </div>
      </div>

      <Dialog open={confirmingVoid} onOpenChange={setConfirmingVoid}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hủy hóa đơn</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Bạn có chắc chắn muốn hủy <span className="font-medium text-foreground">{selectedIds.size}</span>{" "}
            hóa đơn đã chọn? Hóa đơn sẽ chuyển sang trạng thái "Đã hủy" — tồn kho và công nợ liên quan (nếu
            có) sẽ được hoàn trả tự động. Hành động này không thể hoàn tác.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmingVoid(false)}>
              Đóng
            </Button>
            <Button variant="destructive" onClick={confirmVoid} disabled={voidInvoices.isPending}>
              {voidInvoices.isPending ? "Đang hủy..." : "Hủy hóa đơn"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PrintReceiptDialog
        open={!!printInvoice}
        onOpenChange={(o) => !o && setPrintInvoice(null)}
        data={printInvoice ? buildReceiptData(printInvoice) : null}
      />
    </div>
  );
}
