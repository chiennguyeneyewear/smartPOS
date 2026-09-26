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
import { cn, formatCurrency, formatDateTime } from "@/lib/utils";
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

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}

// Toggle pill used for the payment-method and status filters.
function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "h-9 rounded-full border px-3.5 text-sm transition-colors",
        active
          ? "border-primary bg-primary/10 font-medium text-primary"
          : "border-input text-muted-foreground hover:bg-accent",
      )}
    >
      {children}
    </button>
  );
}

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
      cell: ({ row }) => {
        // "18:32 26/09/2026" -> time over date, so the column stays narrow
        const [time = "", date = ""] = formatDateTime(row.original.createdAt).split(" ");
        return (
          <div className="leading-tight">
            <p>{time}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{date}</p>
          </div>
        );
      },
    },
    {
      id: "customer",
      header: "Khách hàng",
      cell: ({ row }) => (
        <div className="min-w-[130px] max-w-[190px] whitespace-normal leading-tight">
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

  const renderDetail = (row: InvoiceListItem) => (
              <InvoiceDetailPanel
                invoice={row}
                branchName={branches?.find((b) => b.id === row.branchId)?.name}
                onPrint={() => setPrintInvoice(row)}
                onVoid={() => {
                  setSelectedIds(new Set([row.id]));
                  setConfirmingVoid(true);
                }}
              />
            );

  return (
    <div className="space-y-4">
      <PageHeader title="Đơn hàng" description="Toàn bộ hóa đơn đã tạo" />

      <div className="space-y-3">
        <Card>
          <CardContent className="flex flex-wrap items-end gap-x-6 gap-y-4 pt-4">
            <FilterGroup label="Thời gian">
              <div className="flex flex-wrap items-center gap-2">
                <Select value={preset} onValueChange={(v) => setPreset(v as PeriodPreset)}>
                  <SelectTrigger className="h-9 w-[160px]">
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
                  <>
                    <DatePicker value={customFrom} onChange={setCustomFrom} className="w-[130px]" />
                    <span className="text-sm text-muted-foreground">-</span>
                    <DatePicker value={customTo} onChange={setCustomTo} className="w-[130px]" />
                  </>
                )}
              </div>
            </FilterGroup>

            {isAdmin && (
              <FilterGroup label="Người bán">
                <Select value={sellerId} onValueChange={setSellerId}>
                  <SelectTrigger className="h-9 w-[150px]">
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
              </FilterGroup>
            )}

            <FilterGroup label="Phương thức thanh toán">
              <div className="flex flex-wrap gap-2">
                {PAY_METHODS.map((m) => (
                  <FilterChip key={m.value} active={payMethods.has(m.value)} onClick={() => togglePayMethod(m.value)}>
                    {m.label}
                  </FilterChip>
                ))}
              </div>
            </FilterGroup>

            <FilterGroup label="Trạng thái hóa đơn">
              <div className="flex flex-wrap gap-2">
                <FilterChip active={showCompleted} onClick={() => setShowCompleted((v) => !v)}>
                  Hoàn thành
                </FilterChip>
                <FilterChip active={showCancelled} onClick={() => setShowCancelled((v) => !v)}>
                  Đã hủy
                </FilterChip>
              </div>
            </FilterGroup>
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
              {selectedIds.size > 0 && (
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
          {/* Phones: one card per invoice instead of a wide table. */}
          <div className="space-y-2 xl:hidden">
            {isLoading ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Đang tải dữ liệu...</p>
            ) : filteredInvoices.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Không có hóa đơn nào</p>
            ) : (
              filteredInvoices.map((inv) => {
                const methods = [...new Set(inv.payments.map((p) => p.method))];
                return (
                  <div key={inv.id} className={cn("rounded-lg border bg-card", inv.id === expandedId && "border-primary")}>
                    <div
                      className="flex cursor-pointer items-start gap-3 p-3"
                      onClick={() => setExpandedId((prev) => (prev === inv.id ? null : inv.id))}
                    >
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={selectedIds.has(inv.id)}
                        onClick={(e) => e.stopPropagation()}
                        onChange={() => toggleOne(inv.id)}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold">{inv.code}</span>
                          {inv.status === "CANCELLED" ? (
                            <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                              Đã hủy
                            </span>
                          ) : (
                            <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                              Hoàn thành
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{formatDateTime(inv.createdAt)}</p>
                        <p className="mt-1 text-sm">{inv.customer?.name ?? "Khách lẻ"}</p>
                        <div className="mt-1 flex items-end justify-between gap-2 text-sm">
                          <span className="text-muted-foreground">
                            {inv.createdByName}
                            {methods.length > 0 && ` · ${methods.map((m) => PAY_LABEL[m] ?? m).join(" + ")}`}
                          </span>
                          <span className="font-semibold tabular-nums">{inv.paidAmount.toLocaleString("en-US")}</span>
                        </div>
                      </div>
                    </div>
                    {inv.id === expandedId && <div className="border-t bg-primary/5 p-3">{renderDetail(inv)}</div>}
                  </div>
                );
              })
            )}
          </div>
          <div className="hidden xl:block">
            <DataTable
              columns={columns}
              compact
              data={filteredInvoices}
              isLoading={isLoading}
              emptyMessage="Không có hóa đơn nào"
              onRowClick={(row) => setExpandedId((prev) => (prev === row.id ? null : row.id))}
              isRowSelected={(row) => row.id === expandedId}
              renderExpandedRow={renderDetail}
            />
          </div>
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
