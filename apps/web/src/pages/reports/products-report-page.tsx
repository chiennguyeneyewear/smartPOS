import { useMemo, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
import { PERIOD_PRESET_OPTIONS, getPeriodRange, type PeriodPreset } from "@/lib/period-presets";
import { useAuthStore } from "@/stores/auth-store";
import { useStockValueReport, useTopProductsReport } from "@/features/reports/hooks";

export function ProductsReportPage() {
  const activeBranchId = useAuthStore((s) => s.activeBranchId);
  const [preset, setPreset] = useState<PeriodPreset>("this_month");
  const range = useMemo(() => getPeriodRange(preset), [preset]);
  const rangeParams = {
    branchId: activeBranchId ?? undefined,
    from: range.from.toISOString(),
    to: range.to.toISOString(),
  };

  const { data: topProducts } = useTopProductsReport({ ...rangeParams, limit: 20 });
  const { data: stockValue } = useStockValueReport(activeBranchId ?? undefined);

  return (
    <div className="space-y-4">
      <PageHeader title="Báo cáo hàng hóa" description="Sản phẩm bán chạy và giá trị tồn kho" />

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
            <CardDescription>Giá trị tồn kho</CardDescription>
            <CardTitle className="text-xl">{formatCurrency(stockValue?.totalValue ?? 0)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Tổng số lượng tồn</CardDescription>
            <CardTitle className="text-xl">{stockValue?.totalUnits ?? 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Số mặt hàng có tồn kho</CardDescription>
            <CardTitle className="text-xl">{stockValue?.itemCount ?? 0}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sản phẩm bán chạy</CardTitle>
        </CardHeader>
        <CardContent>
          {!topProducts?.length ? (
            <p className="p-4 text-center text-sm text-muted-foreground">Chưa có dữ liệu bán hàng trong kỳ này</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-1.5 font-medium">Sản phẩm</th>
                  <th className="py-1.5 text-right font-medium">Số lượng bán</th>
                  <th className="py-1.5 text-right font-medium">Doanh thu</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((p) => (
                  <tr key={p.productId} className="border-b last:border-0">
                    <td className="py-1.5">{p.name}</td>
                    <td className="py-1.5 text-right text-muted-foreground">{p.quantity}</td>
                    <td className="py-1.5 text-right font-medium">{formatCurrency(p.revenue)}</td>
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
