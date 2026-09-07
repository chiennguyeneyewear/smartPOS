import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import {
  useBranchComparisonReport,
  useProfitReport,
  useRevenueReport,
  useStockValueReport,
  useTopProductsReport,
} from "@/features/reports/hooks";

export function ReportsPage() {
  const activeBranchId = useAuthStore((s) => s.activeBranchId);
  const { data: revenue } = useRevenueReport({ branchId: activeBranchId ?? undefined, groupBy: "day" });
  const { data: topProducts } = useTopProductsReport({ branchId: activeBranchId ?? undefined, limit: 5 });
  const { data: stockValue } = useStockValueReport(activeBranchId ?? undefined);
  const { data: branchComparison } = useBranchComparisonReport({});
  const { data: profit } = useProfitReport({ branchId: activeBranchId ?? undefined });

  return (
    <div className="space-y-4">
      <PageHeader title="Báo cáo" description="Doanh thu, lợi nhuận &amp; hiệu suất bán hàng" />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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
        <Card>
          <CardHeader>
            <CardDescription>Giá trị tồn kho</CardDescription>
            <CardTitle className="text-xl">{formatCurrency(stockValue?.totalValue ?? 0)}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Doanh thu theo ngày</CardTitle>
        </CardHeader>
        <CardContent className="h-64">
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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top sản phẩm bán chạy</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <tbody>
                {topProducts?.map((p) => (
                  <tr key={p.productId} className="border-b last:border-0">
                    <td className="py-1.5">{p.name}</td>
                    <td className="py-1.5 text-right text-muted-foreground">{p.quantity}</td>
                    <td className="py-1.5 text-right font-medium">{formatCurrency(p.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>So sánh chi nhánh</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <tbody>
                {branchComparison?.map((b) => (
                  <tr key={b.branchId} className="border-b last:border-0">
                    <td className="py-1.5">{b.branchName}</td>
                    <td className="py-1.5 text-right text-muted-foreground">{b.invoiceCount} đơn</td>
                    <td className="py-1.5 text-right font-medium">{formatCurrency(b.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
