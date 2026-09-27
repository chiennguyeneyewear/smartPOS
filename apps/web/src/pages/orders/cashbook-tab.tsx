import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { DatePicker } from "@/components/shared/date-picker";
import { PAYMENT_LABELS } from "@/lib/payment";
import { cn, formatCurrency } from "@/lib/utils";
import { usePaymentsOnDay } from "@/features/sales/hooks";
import { CashSheets } from "./cash-sheets";

const todayVn = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);

const KIND_STYLE: Record<string, string> = {
  "Bán hàng": "bg-muted text-muted-foreground",
  Cọc: "bg-amber-100 text-amber-800",
  "Thu nốt": "bg-success/10 text-success",
};

// The day's thu-chi sheet: the scan or photo of the paper sheet is what goes here. What the system recorded
// for the same day stays underneath (collapsed) so the two can be checked against each other.
export function CashbookTab({ isAdmin }: { isAdmin: boolean; sellers?: { id: string; name: string }[] }) {
  const [date, setDate] = useState(todayVn());
  const [showNumbers, setShowNumbers] = useState(false);
  const { data, isLoading } = usePaymentsOnDay({ date }, { enabled: showNumbers });
  const rows = data?.payments ?? [];

  const byMethod = new Map<string, number>();
  for (const r of rows) byMethod.set(r.method, (byMethod.get(r.method) ?? 0) + r.amount);
  const total = rows.reduce((sum, r) => sum + r.amount, 0);
  const time = (iso: string) => new Date(new Date(iso).getTime() + 7 * 3600_000).toISOString().slice(11, 16);

  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="flex flex-wrap items-end gap-x-6 gap-y-3 pt-4">
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ngày</p>
            <DatePicker value={date} onChange={setDate} className="w-[150px]" />
          </div>
          {isAdmin && (
            <p className="pb-2 text-xs text-muted-foreground">Admin xem được file của tất cả người bán, tên người thêm nằm dưới mỗi file.</p>
          )}
        </CardContent>
      </Card>

      <CashSheets date={date} />

      <div className="rounded-md border">
        <button
          type="button"
          onClick={() => setShowNumbers((v) => !v)}
          className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium"
        >
          Đối chiếu với số liệu hệ thống ghi nhận trong ngày
          <ChevronDown className={cn("h-4 w-4 transition-transform", showNumbers && "rotate-180")} />
        </button>
        {showNumbers && (
          <div className="space-y-3 border-t p-4">
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
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
            <div className="overflow-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left font-semibold text-muted-foreground">
                  <tr>
                    <th className="p-2.5">Giờ</th>
                    <th className="p-2.5">Khách hàng</th>
                    <th className="p-2.5">Hóa đơn</th>
                    <th className="p-2.5">Loại</th>
                    <th className="p-2.5">Phương thức</th>
                    <th className="p-2.5 text-right">Số tiền thu</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading && (
                    <tr>
                      <td colSpan={6} className="p-4 text-center text-muted-foreground">
                        Đang tải dữ liệu...
                      </td>
                    </tr>
                  )}
                  {!isLoading && rows.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-4 text-center text-muted-foreground">
                        Hệ thống chưa ghi nhận khoản thu nào trong ngày này
                      </td>
                    </tr>
                  )}
                  {rows.map((r) => (
                    <tr key={r.id} className="border-t">
                      <td className="whitespace-nowrap p-2.5 tabular-nums">{time(r.paidAt)}</td>
                      <td className="p-2.5 font-medium">{r.customerName}</td>
                      <td className="whitespace-nowrap p-2.5">{r.invoiceCode}</td>
                      <td className="p-2.5">
                        <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", KIND_STYLE[r.kind])}>{r.kind}</span>
                      </td>
                      <td className="whitespace-nowrap p-2.5">
                        {PAYMENT_LABELS[r.method]}
                        {r.reference && <span className="ml-2 text-xs text-muted-foreground">({r.reference})</span>}
                      </td>
                      <td className="whitespace-nowrap p-2.5 text-right font-medium tabular-nums">
                        {r.amount.toLocaleString("en-US")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {(data?.pending.length ?? 0) > 0 && (
              <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                {data?.pending.length} hóa đơn ra trong ngày chưa ghi nhận tiền:{" "}
                {data?.pending.map((p) => `${p.invoiceCode} ${p.customerName}`).join(" · ")}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
