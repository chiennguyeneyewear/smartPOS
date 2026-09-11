import { useMemo, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
import { PERIOD_PRESET_OPTIONS, getPeriodRange, type PeriodPreset } from "@/lib/period-presets";
import { useAuthStore } from "@/stores/auth-store";
import { useSellerPerformanceReport, useBranchComparisonReport } from "@/features/reports/hooks";

export function AnalyticsPerformancePage() {
  const activeBranchId = useAuthStore((s) => s.activeBranchId);
  const [preset, setPreset] = useState<PeriodPreset>("this_month");
  const range = useMemo(() => getPeriodRange(preset), [preset]);
  const rangeParams = {
    branchId: activeBranchId ?? undefined,
    from: range.from.toISOString(),
    to: range.to.toISOString(),
  };

  const { data: sellers } = useSellerPerformanceReport(rangeParams);
  const { data: branches } = useBranchComparisonReport({ from: rangeParams.from, to: rangeParams.to });

  return (
    <div className="space-y-4">
      <PageHeader title="Phân tích hiệu quả" description="Hiệu quả bán hàng theo nhân viên và chi nhánh" />

      <Select value={preset} onValueChange={(v) => setPreset(v as PeriodPreset)}>
        <SelectTrigger className="max-w-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PERIOD_PRESET_OPTIONS.filter((o) => o.value !== "custom").map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Hiệu quả theo nhân viên</CardTitle>
          </CardHeader>
          <CardContent>
            {!sellers?.length ? (
              <p className="p-4 text-center text-sm text-muted-foreground">Chưa có dữ liệu bán hàng trong kỳ này</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-1.5 font-medium">Nhân viên</th>
                    <th className="py-1.5 text-right font-medium">Số hóa đơn</th>
                    <th className="py-1.5 text-right font-medium">Doanh thu</th>
                  </tr>
                </thead>
                <tbody>
                  {sellers.map((s) => (
                    <tr key={s.userId} className="border-b last:border-0">
                      <td className="py-1.5">{s.username}</td>
                      <td className="py-1.5 text-right text-muted-foreground">{s.invoiceCount}</td>
                      <td className="py-1.5 text-right font-medium">{formatCurrency(s.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Hiệu quả theo chi nhánh</CardTitle>
          </CardHeader>
          <CardContent>
            {!branches?.length ? (
              <p className="p-4 text-center text-sm text-muted-foreground">Chưa có dữ liệu bán hàng trong kỳ này</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-1.5 font-medium">Chi nhánh</th>
                    <th className="py-1.5 text-right font-medium">Số hóa đơn</th>
                    <th className="py-1.5 text-right font-medium">Doanh thu</th>
                  </tr>
                </thead>
                <tbody>
                  {branches.map((b) => (
                    <tr key={b.branchId} className="border-b last:border-0">
                      <td className="py-1.5">{b.branchName}</td>
                      <td className="py-1.5 text-right text-muted-foreground">{b.invoiceCount}</td>
                      <td className="py-1.5 text-right font-medium">{formatCurrency(b.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
