import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
import { PERIOD_PRESET_OPTIONS, getPeriodRange, type PeriodPreset } from "@/lib/period-presets";
import { useAuthStore } from "@/stores/auth-store";
import { useProfitReport, useRevenueReport } from "@/features/reports/hooks";

export function SalesReportPage() {
  const activeBranchId = useAuthStore((s) => s.activeBranchId);
  const [preset, setPreset] = useState<PeriodPreset>("this_month");
  const range = useMemo(() => getPeriodRange(preset), [preset]);
  const rangeParams = {
    branchId: activeBranchId ?? undefined,
    from: range.from.toISOString(),
    to: range.to.toISOString(),
  };

  const { data: revenue } = useRevenueReport({ ...rangeParams, groupBy: "day" });
  const { data: profit } = useProfitReport(rangeParams);

  return (
    <div className="space-y-4">
      <PageHeader title="Báo cáo bán hàng" description="Doanh thu và lợi nhuận theo thời gian" />

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
            <CardDescription>Doanh thu</CardDescription>
            <CardTitle className="text-xl">{formatCurrency(profit?.revenue ?? 0)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Lợi nhuận gộp</CardDescription>
            <CardTitle className="text-xl text-success">{formatCurrency(profit?.profit ?? 0)}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Doanh thu theo ngày</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={revenue ?? []}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="period" fontSize={12} />
              <YAxis fontSize={12} tickFormatter={(v) => `${v / 1000}k`} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Chi tiết theo ngày</CardTitle>
        </CardHeader>
        <CardContent>
          {!revenue?.length ? (
            <p className="p-4 text-center text-sm text-muted-foreground">Chưa có dữ liệu trong khoảng thời gian này</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-1.5 font-medium">Ngày</th>
                  <th className="py-1.5 text-right font-medium">Doanh thu</th>
                </tr>
              </thead>
              <tbody>
                {revenue.map((r) => (
                  <tr key={r.period} className="border-b last:border-0">
                    <td className="py-1.5">{r.period}</td>
                    <td className="py-1.5 text-right font-medium">{formatCurrency(r.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
