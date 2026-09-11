import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
import { PERIOD_PRESET_OPTIONS, getPeriodRange, type PeriodPreset } from "@/lib/period-presets";
import { useAuthStore } from "@/stores/auth-store";
import { useDashboardSummary, useRevenueReport } from "@/features/reports/hooks";

export function OrdersReportPage() {
  const activeBranchId = useAuthStore((s) => s.activeBranchId);
  const [preset, setPreset] = useState<PeriodPreset>("this_month");
  const range = useMemo(() => getPeriodRange(preset), [preset]);
  const rangeParams = {
    branchId: activeBranchId ?? undefined,
    from: range.from.toISOString(),
    to: range.to.toISOString(),
  };

  const { data: summary } = useDashboardSummary(rangeParams);
  const { data: revenue } = useRevenueReport({ ...rangeParams, groupBy: "day" });

  return (
    <div className="space-y-4">
      <PageHeader title="Báo cáo đặt hàng" description="Số lượng và doanh thu hóa đơn theo thời gian" />

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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>Doanh thu</CardDescription>
            <CardTitle className="text-xl">{formatCurrency(summary?.revenue ?? 0)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Hóa đơn hoàn thành</CardDescription>
            <CardTitle className="text-xl">{summary?.invoiceCount ?? 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Hóa đơn đã hủy</CardDescription>
            <CardTitle className="text-xl text-destructive">{summary?.cancelledCount ?? 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>So với kỳ trước</CardDescription>
            <CardTitle className={(summary?.changeVsPreviousPct ?? 0) >= 0 ? "text-xl text-success" : "text-xl text-destructive"}>
              {(summary?.changeVsPreviousPct ?? 0) >= 0 ? "+" : ""}
              {(summary?.changeVsPreviousPct ?? 0).toFixed(1)}%
            </CardTitle>
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
    </div>
  );
}
