import { useMemo, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
import { PERIOD_PRESET_OPTIONS, getPeriodRange, type PeriodPreset } from "@/lib/period-presets";
import { useAuthStore } from "@/stores/auth-store";
import { useCustomerInsightsReport } from "@/features/reports/hooks";

export function AnalyticsCustomersPage() {
  const activeBranchId = useAuthStore((s) => s.activeBranchId);
  const [preset, setPreset] = useState<PeriodPreset>("this_month");
  const range = useMemo(() => getPeriodRange(preset), [preset]);
  const rangeParams = {
    branchId: activeBranchId ?? undefined,
    from: range.from.toISOString(),
    to: range.to.toISOString(),
  };

  const { data } = useCustomerInsightsReport(rangeParams);

  return (
    <div className="space-y-4">
      <PageHeader title="Phân tích khách hàng" description="Số lượng khách mua hàng và công nợ" />

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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Tổng số khách hàng</CardDescription>
            <CardTitle className="text-xl">{data?.totalCustomers ?? 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Khách có mua hàng trong kỳ</CardDescription>
            <CardTitle className="text-xl">{data?.buyingCustomers ?? 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Doanh thu trung bình / khách</CardDescription>
            <CardTitle className="text-xl">{formatCurrency(data?.avgRevenuePerCustomer ?? 0)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Số khách còn nợ</CardDescription>
            <CardTitle className="text-xl">{data?.debtCustomerCount ?? 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Tổng công nợ</CardDescription>
            <CardTitle className="text-xl text-destructive">{formatCurrency(data?.totalDebt ?? 0)}</CardTitle>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
