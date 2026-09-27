import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { DatePicker } from "@/components/shared/date-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PAYMENT_LABELS } from "@/lib/payment";
import { cn, formatCurrency } from "@/lib/utils";
import { usePaymentsOnDay } from "@/features/sales/hooks";

const todayVn = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);

const KIND_STYLE: Record<string, string> = {
  "Bán hàng": "bg-muted text-muted-foreground",
  Cọc: "bg-amber-100 text-amber-800",
  "Thu nốt": "bg-success/10 text-success",
};

// The day's money book: every payment received on the chosen day, who paid, how, and whether it was a whole
// sale, a deposit or the balance collected later. This is what used to be written on the paper thu-chi sheet.
export function CashbookTab({
  isAdmin,
  sellers,
}: {
  isAdmin: boolean;
  sellers?: { id: string; name: string }[];
}) {
  const [date, setDate] = useState(todayVn());
  const [sellerId, setSellerId] = useState("all");
  const { data, isLoading } = usePaymentsOnDay({ date, sellerId: isAdmin && sellerId !== "all" ? sellerId : undefined });
  const rows = data?.payments ?? [];

  const byMethod = new Map<string, number>();
  for (const r of rows) byMethod.set(r.method, (byMethod.get(r.method) ?? 0) + r.amount);
  const total = rows.reduce((sum, r) => sum + r.amount, 0);
  const pendingTotal = (data?.pending ?? []).reduce((sum, p) => sum + p.amount, 0);
  const time = (iso: string) =>
    new Date(new Date(iso).getTime() + 7 * 3600_000).toISOString().slice(11, 16);

  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="flex flex-wrap items-end gap-x-6 gap-y-3 pt-4">
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ngày</p>
            <DatePicker value={date} onChange={setDate} className="w-[150px]" />
          </div>
          {isAdmin && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Người bán</p>
              <Select value={sellerId} onValueChange={setSellerId}>
                <SelectTrigger className="h-9 w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  {sellers?.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="ml-auto flex flex-wrap gap-x-6 gap-y-1 text-sm">
            {[...byMethod.entries()].map(([m, amount]) => (
              <span key={m} className="text-muted-foreground">
                {PAYMENT_LABELS[m as keyof typeof PAYMENT_LABELS] ?? m}:{" "}
                <span className="font-semibold text-foreground">{formatCurrency(amount)}</span>
              </span>
            ))}
            <span className="text-muted-foreground">
              Tổng thu: <span className="font-semibold text-foreground">{formatCurrency(total)}</span>
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="overflow-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-sm font-semibold text-muted-foreground">
            <tr>
              <th className="p-3">Giờ</th>
              <th className="p-3">Khách hàng</th>
              <th className="p-3">Hóa đơn</th>
              <th className="p-3">Loại</th>
              <th className="p-3">Phương thức</th>
              <th className="p-3 text-right">Số tiền thu</th>
              {isAdmin && <th className="p-3">Người bán</th>}
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={isAdmin ? 7 : 6} className="p-6 text-center text-muted-foreground">
                  Đang tải dữ liệu...
                </td>
              </tr>
            )}
            {!isLoading && rows.length === 0 && (
              <tr>
                <td colSpan={isAdmin ? 7 : 6} className="p-6 text-center text-muted-foreground">
                  Chưa có khoản thu nào trong ngày này
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="whitespace-nowrap p-3 tabular-nums">{time(r.paidAt)}</td>
                <td className="p-3 font-medium">{r.customerName}</td>
                <td className="whitespace-nowrap p-3">{r.invoiceCode}</td>
                <td className="p-3">
                  <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", KIND_STYLE[r.kind])}>{r.kind}</span>
                </td>
                <td className="whitespace-nowrap p-3">
                  {PAYMENT_LABELS[r.method]}
                  {r.reference && <span className="ml-2 text-xs text-muted-foreground">({r.reference})</span>}
                </td>
                <td className="whitespace-nowrap p-3 text-right font-medium tabular-nums">{r.amount.toLocaleString("en-US")}</td>
                {isAdmin && <td className="p-3">{r.sellerName}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(data?.pending.length ?? 0) > 0 && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <p className="font-medium">
            {data?.pending.length} hóa đơn ra trong ngày chưa ghi nhận tiền ({formatCurrency(pendingTotal)}). Mở hóa đơn
            trong tab Hóa đơn và bấm Xác nhận thanh toán.
          </p>
          <p className="mt-1 text-xs">{data?.pending.map((p) => `${p.invoiceCode} ${p.customerName}`).join(" · ")}</p>
        </div>
      )}
    </div>
  );
}
