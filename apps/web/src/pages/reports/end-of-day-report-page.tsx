import { useState } from "react";
import type { PaymentMethod } from "@smartpos/shared";
import { PageHeader } from "@/components/shared/page-header";
import { DatePicker } from "@/components/shared/date-picker";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import { useEndOfDayReport } from "@/features/reports/hooks";

const METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: "Tiền mặt",
  BANK_TRANSFER: "Chuyển khoản",
  CARD: "Quẹt thẻ",
  DEBT: "Ghi nợ",
};

function todayValue() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function EndOfDayReportPage() {
  const activeBranchId = useAuthStore((s) => s.activeBranchId);
  const [date, setDate] = useState(todayValue);
  const { data, isLoading } = useEndOfDayReport({ branchId: activeBranchId ?? undefined, date });

  return (
    <div className="space-y-4">
      <PageHeader title="Báo cáo cuối ngày" description="Đối soát doanh thu và tiền mặt theo ngày" />

      <DatePicker value={date} onChange={setDate} className="max-w-xs" />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Đang tải dữ liệu...</p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardDescription>Doanh thu</CardDescription>
                <CardTitle className="text-xl">{formatCurrency(data?.revenue ?? 0)}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Hóa đơn hoàn thành</CardDescription>
                <CardTitle className="text-xl">{data?.invoiceCount ?? 0}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Hóa đơn đã hủy</CardDescription>
                <CardTitle className="text-xl text-destructive">{data?.cancelledCount ?? 0}</CardTitle>
              </CardHeader>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Doanh thu theo phương thức thanh toán</CardTitle>
            </CardHeader>
            <CardContent>
              {!data?.paymentBreakdown.length ? (
                <p className="p-4 text-center text-sm text-muted-foreground">Chưa có giao dịch nào trong ngày này</p>
              ) : (
                <table className="w-full text-sm">
                  <tbody>
                    {data.paymentBreakdown.map((p) => (
                      <tr key={p.method} className="border-b last:border-0">
                        <td className="py-1.5">{METHOD_LABELS[p.method as PaymentMethod] ?? p.method}</td>
                        <td className="py-1.5 text-right font-medium">{formatCurrency(p.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
