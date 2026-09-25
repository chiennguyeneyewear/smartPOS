import { useState } from "react";
import { Ban, FileDown, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formatDateTime } from "@/lib/utils";
import type { InvoiceListItem } from "@/features/sales/api";

const fmt = (n: number) => n.toLocaleString("en-US");

// Goods total after per-line discounts, so it reconciles with the invoice discount and amount due.
// (invoice.subTotal is the gross before line discounts and would not add up.)
export function goodsTotal(invoice: InvoiceListItem): number {
  return invoice.items.reduce((sum, item) => sum + item.lineTotal, 0);
}

const SALE_MODE_LABELS: Record<string, string> = {
  NORMAL: "Bán trực tiếp",
  QUICK: "Bán nhanh",
  DELIVERY: "Giao hàng",
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: "Tiền mặt",
  BANK_TRANSFER: "Chuyển khoản",
  CARD: "Quẹt thẻ",
  DEBT: "Ghi nợ",
};

type Tab = "info" | "payments";

function MetaField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-3 text-sm">
      <span className="w-20 shrink-0 text-muted-foreground">{label}:</span>
      <span className="min-w-0 truncate">{value}</span>
    </div>
  );
}

function TotalLine({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-6 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("tabular-nums", bold && "font-semibold")}>{value}</span>
    </div>
  );
}

async function exportInvoice(invoice: InvoiceListItem) {
  const XLSX = await import("xlsx");
  const rows = invoice.items.map((item) => ({
    "Mã hàng": item.product.sku,
    "Tên hàng": item.product.name,
    "Số lượng": item.quantity,
    "Đơn giá": item.unitPrice,
    "Giảm giá": item.discount,
    "Giá bán": item.quantity ? item.lineTotal / item.quantity : 0,
    "Thành tiền": item.lineTotal,
  }));
  const sheet = XLSX.utils.json_to_sheet(rows);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, invoice.code);
  XLSX.writeFile(book, `${invoice.code}.xlsx`);
}

// Inline detail shown under a selected row in Đơn hàng: who sold what, to whom,
// for how much, and how it was paid.
export function InvoiceDetailPanel({
  invoice,
  branchName,
  onPrint,
  onVoid,
}: {
  invoice: InvoiceListItem;
  branchName?: string;
  onPrint: () => void;
  onVoid: () => void;
}) {
  const [tab, setTab] = useState<Tab>("info");
  const isCompleted = invoice.status === "COMPLETED";
  const customer = invoice.customer;

  const tabClass = (active: boolean) =>
    cn(
      "-mb-px border-b-2 px-1 pb-2 text-sm font-medium transition-colors",
      active ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground",
    );

  return (
    <div className="space-y-4 text-sm" onClick={(e) => e.stopPropagation()}>
      <div className="flex gap-6 border-b">
        <button type="button" className={tabClass(tab === "info")} onClick={() => setTab("info")}>
          Thông tin
        </button>
        <button type="button" className={tabClass(tab === "payments")} onClick={() => setTab("payments")}>
          Lịch sử thanh toán
        </button>
      </div>

      {tab === "info" ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-lg font-semibold">
                {customer ? `${customer.code} - ${customer.name}` : "Khách lẻ"}
              </span>
              <span className="text-muted-foreground">{invoice.code}</span>
              <span
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-xs font-medium",
                  isCompleted ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive",
                )}
              >
                {isCompleted ? "Hoàn thành" : "Đã hủy"}
              </span>
            </div>
            {customer?.phone && <span className="text-muted-foreground">{customer.phone}</span>}
          </div>

          <div className="grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-3">
            <MetaField label="Người tạo" value={invoice.createdByName} />
            <MetaField label="Người bán" value={invoice.createdByName} />
            <MetaField label="Ngày bán" value={formatDateTime(invoice.completedAt ?? invoice.createdAt)} />
            <MetaField label="Kênh bán" value={SALE_MODE_LABELS[invoice.saleMode] ?? invoice.saleMode} />
            <MetaField label="Chi nhánh" value={branchName ?? "—"} />
            <MetaField label="Bảng giá" value="Bảng giá chung" />
          </div>

          <div className="overflow-x-auto rounded-md border">
            <table className="w-full min-w-[640px]">
              <thead className="bg-muted/50">
                <tr className="text-left text-xs font-semibold text-muted-foreground">
                  <th className="p-2.5">Mã hàng</th>
                  <th className="p-2.5">Tên hàng</th>
                  <th className="p-2.5 text-right">Số lượng</th>
                  <th className="p-2.5 text-right">Đơn giá</th>
                  <th className="p-2.5 text-right">Giảm giá</th>
                  <th className="p-2.5 text-right">Giá bán</th>
                  <th className="p-2.5 text-right">Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, i) => (
                  <tr key={`${item.productId}-${i}`} className="border-t">
                    <td className="p-2.5 text-primary">{item.product.sku}</td>
                    <td className="p-2.5">{item.product.name}</td>
                    <td className="p-2.5 text-right tabular-nums">{fmt(item.quantity)}</td>
                    <td className="p-2.5 text-right tabular-nums">{fmt(item.unitPrice)}</td>
                    <td className="p-2.5 text-right tabular-nums">{item.discount > 0 ? fmt(item.discount) : ""}</td>
                    <td className="p-2.5 text-right tabular-nums">
                      {fmt(item.quantity ? item.lineTotal / item.quantity : 0)}
                    </td>
                    <td className="p-2.5 text-right font-semibold tabular-nums">{fmt(item.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
            <div
              className={cn(
                "min-h-[104px] space-y-2 whitespace-pre-wrap rounded-md border px-3 py-2",
                customer?.note || invoice.note ? "" : "text-muted-foreground",
              )}
            >
              {customer?.note && <p>{customer.note}</p>}
              {invoice.note && (
                <p className={customer?.note ? "border-t pt-2" : ""}>
                  <span className="text-muted-foreground">Ghi chú hóa đơn: </span>
                  {invoice.note}
                </p>
              )}
              {!customer?.note && !invoice.note && "Ghi chú..."}
            </div>
            <div className="space-y-2.5">
              <TotalLine label={`Tổng tiền hàng (${invoice.items.length})`} value={fmt(goodsTotal(invoice))} />
              <TotalLine label="Giảm giá hóa đơn" value={fmt(invoice.discountAmount)} />
              <TotalLine label="Khách cần trả" value={fmt(invoice.totalAmount)} />
              <TotalLine label="Khách đã trả" value={fmt(invoice.paidAmount)} bold />
            </div>
          </div>
        </>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full min-w-[420px]">
            <thead className="bg-muted/50">
              <tr className="text-left text-xs font-semibold text-muted-foreground">
                <th className="p-2.5">Thời gian</th>
                <th className="p-2.5">Phương thức</th>
                <th className="p-2.5 text-right">Số tiền</th>
              </tr>
            </thead>
            <tbody>
              {invoice.payments.length === 0 ? (
                <tr>
                  <td colSpan={3} className="p-4 text-center text-muted-foreground">
                    Chưa có thanh toán nào
                  </td>
                </tr>
              ) : (
                invoice.payments.map((p, i) => (
                  <tr key={i} className="border-t">
                    <td className="p-2.5">{formatDateTime(p.createdAt ?? invoice.completedAt ?? invoice.createdAt)}</td>
                    <td className="p-2.5">{PAYMENT_METHOD_LABELS[p.method] ?? p.method}</td>
                    <td className="p-2.5 text-right font-medium tabular-nums">{fmt(p.amount)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
        <div className="flex items-center gap-1">
          {isCompleted && (
            <Button variant="ghost" size="sm" className="gap-1.5" onClick={onVoid}>
              <Ban className="h-4 w-4" /> Hủy
            </Button>
          )}
          <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => exportInvoice(invoice)}>
            <FileDown className="h-4 w-4" /> Xuất file
          </Button>
        </div>
        {isCompleted && (
          <Button variant="outline" size="sm" className="gap-1.5" onClick={onPrint}>
            <Printer className="h-4 w-4" /> In
          </Button>
        )}
      </div>
    </div>
  );
}
