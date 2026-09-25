import { useEffect, useMemo, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { ReceiptText, RotateCcw } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/shared/date-picker";
import { formatCurrency, formatRelativeTime } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import { ChartTooltip, ColumnBars, MoneyValue, RankedBars, formatCompact, formatFull } from "./dashboard-widgets";
import { useReportBranchId } from "@/hooks/use-report-branch-id";
import {
  useBranchComparisonReport,
  useDashboardSummary,
  useProfitReport,
  useRevenueReport,
  useSellerPerformanceReport,
  useTopCustomersReport,
  useTopProductsReport,
} from "@/features/reports/hooks";
import { PERIOD_PRESET_OPTIONS, formatPeriodLabel, getPeriodRange, type PeriodPreset } from "@/lib/period-presets";

const LABEL_CLASS = "text-xs font-medium uppercase tracking-wider text-muted-foreground";
const EMPTY_CLASS = "flex h-32 items-center justify-center text-sm text-muted-foreground";
const BRANCH_COLORS = ["hsl(var(--primary))", "#f97316", "#eab308", "#22c55e", "#a855f7", "#ec4899"];

type ChartMode = "day" | "hour" | "weekday";

const CHART_TABS: { value: ChartMode; label: string }[] = [
  { value: "day", label: "Theo ngày" },
  { value: "hour", label: "Theo giờ" },
  { value: "weekday", label: "Theo thứ" },
];

function toDateInputValue(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Each widget can override the page-wide period without touching the others;
// changing the page-wide selector resets every widget back to following it.
function useCardPeriod(globalPreset: PeriodPreset, customFrom: string, customTo: string) {
  const [override, setOverride] = useState<PeriodPreset | null>(null);
  useEffect(() => setOverride(null), [globalPreset, customFrom, customTo]);
  const preset = override ?? globalPreset;
  const range = useMemo(() => getPeriodRange(preset, { from: customFrom, to: customTo }), [preset, customFrom, customTo]);
  return {
    preset,
    setPreset: setOverride,
    fromIso: range.from.toISOString(),
    toIso: range.to.toISOString(),
    label: formatPeriodLabel(preset, range),
  };
}

function PeriodSelect({
  period,
}: {
  period: { preset: PeriodPreset; setPreset: (p: PeriodPreset) => void; label: string };
}) {
  const options = PERIOD_PRESET_OPTIONS.filter((o) => o.value !== "custom" || period.preset === "custom");
  return (
    <Select value={period.preset} onValueChange={(v) => period.setPreset(v as PeriodPreset)}>
      <SelectTrigger className="h-8 w-[150px] shrink-0 text-xs">
        <SelectValue>{period.label}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.value === "custom" ? period.label : option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function DashboardPage() {
  const reportBranchId = useReportBranchId();
  const isAdmin = useAuthStore((s) => s.user?.role === "admin");
  const [chartMode, setChartMode] = useState<ChartMode>("day");
  const [preset, setPreset] = useState<PeriodPreset>("today");
  const [customFrom, setCustomFrom] = useState(() => toDateInputValue(new Date()));
  const [customTo, setCustomTo] = useState(() => toDateInputValue(new Date()));

  const range = useMemo(
    () => getPeriodRange(preset, { from: customFrom, to: customTo }),
    [preset, customFrom, customTo],
  );
  const fromIso = range.from.toISOString();
  const toIso = range.to.toISOString();
  const periodLabel = formatPeriodLabel(preset, range);

  const { data: summary } = useDashboardSummary({ branchId: reportBranchId, from: fromIso, to: toIso });
  const { data: revenue } = useRevenueReport({
    branchId: reportBranchId,
    groupBy: chartMode,
    from: fromIso,
    to: toIso,
  });

  const chartData = useMemo(() => revenue ?? [], [revenue]);

  const profitPeriod = useCardPeriod(preset, customFrom, customTo);
  const branchPeriod = useCardPeriod(preset, customFrom, customTo);
  const sellerPeriod = useCardPeriod(preset, customFrom, customTo);
  const productsPeriod = useCardPeriod(preset, customFrom, customTo);
  const [productMetric, setProductMetric] = useState<"revenue" | "quantity">("revenue");
  const customersPeriod = useCardPeriod(preset, customFrom, customTo);

  const { data: topProducts } = useTopProductsReport({
    branchId: reportBranchId,
    from: productsPeriod.fromIso,
    to: productsPeriod.toIso,
    limit: 10,
    sortBy: productMetric,
  });
  const { data: topCustomers } = useTopCustomersReport({
    branchId: reportBranchId,
    from: customersPeriod.fromIso,
    to: customersPeriod.toIso,
    limit: 10,
  });

  const { data: profit } = useProfitReport({ branchId: reportBranchId, from: profitPeriod.fromIso, to: profitPeriod.toIso });
  const { data: branchComparison } = useBranchComparisonReport({ from: branchPeriod.fromIso, to: branchPeriod.toIso });
  const { data: sellerPerformance } = useSellerPerformanceReport({
    branchId: reportBranchId,
    from: sellerPeriod.fromIso,
    to: sellerPeriod.toIso,
  });

  const branchTotal = useMemo(
    () => (branchComparison ?? []).reduce((sum, b) => sum + b.revenue, 0),
    [branchComparison],
  );

  const topProductsData = useMemo(
    () =>
      (topProducts ?? []).map((p) => ({
        key: p.productId,
        name: p.name,
        value: productMetric === "quantity" ? p.quantity : p.revenue,
      })),
    [topProducts, productMetric],
  );
  const topCustomersData = useMemo(
    () => (topCustomers ?? []).map((c) => ({ key: c.customerId, name: c.name, value: c.revenue })),
    [topCustomers],
  );
  const sellerData = useMemo(
    () => (sellerPerformance ?? []).map((s) => ({ key: s.userId, name: s.username, value: s.revenue })),
    [sellerPerformance],
  );
  const profitMargin = profit && profit.revenue > 0 ? (profit.profit / profit.revenue) * 100 : 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageHeader title="Tổng quan" description={`Kết quả bán hàng: ${periodLabel}`} />
        <div className="flex flex-wrap items-center gap-2">
          <Select value={preset} onValueChange={(v) => setPreset(v as PeriodPreset)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIOD_PRESET_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {preset === "custom" && (
            <div className="flex items-center gap-2">
              <DatePicker value={customFrom} onChange={setCustomFrom} className="w-[130px]" />
              <span className="text-sm text-muted-foreground">-</span>
              <DatePicker value={customTo} onChange={setCustomTo} className="w-[130px]" />
            </div>
          )}
        </div>
      </div>

      <Card>
        <CardHeader className="flex-row items-start justify-end gap-2 space-y-0">
          <PeriodSelect period={profitPeriod} />
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-gradient-to-br from-primary to-primary/75 p-4 text-white shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wider text-white/80">Lợi nhuận</p>
            <MoneyValue value={profit?.profit ?? 0} className="mt-2 block text-2xl font-semibold" />
            <p className="mt-1 text-xs text-white/80">Biên lợi nhuận {profitMargin.toFixed(1).replace(".", ",")}%</p>
          </div>
          <div className="rounded-xl bg-gradient-to-br from-orange-500 to-orange-400 p-4 text-white shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wider text-white/80">Doanh thu</p>
            <MoneyValue value={profit?.revenue ?? 0} className="mt-2 block text-2xl font-semibold" />
          </div>
          <div className="rounded-xl bg-gradient-to-br from-amber-500 to-yellow-400 p-4 text-white shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wider text-white/85">Giá vốn</p>
            <MoneyValue value={profit?.cost ?? 0} className="mt-2 block text-2xl font-semibold" />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
            <div>
              <p className={LABEL_CLASS}>Doanh thu thuần</p>
              <MoneyValue value={summary?.revenue ?? 0} className="mt-2 block text-3xl font-semibold" />
            </div>
            <Tabs value={chartMode} onValueChange={(v) => setChartMode(v as ChartMode)}>
              <TabsList>
                {CHART_TABS.map((tab) => (
                  <TabsTrigger key={tab.value} value={tab.value}>
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent className="h-72">
            <ColumnBars data={chartData} />
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Hoạt động gần đây</CardTitle>
            </CardHeader>
            <CardContent className="max-h-[420px] space-y-4 overflow-y-auto pr-1">
              {summary?.recentActivities.length ? (
                summary.recentActivities.map((activity) => {
                  const isCancelled = activity.type === "CANCELLED";
                  const Icon = isCancelled ? RotateCcw : ReceiptText;
                  return (
                    <div key={`${activity.type}-${activity.id}`} className="flex items-start gap-3 text-sm">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="leading-snug">
                          <span className="font-semibold text-primary">{activity.userName}</span>{" "}
                          <span className={cn("font-medium", isCancelled ? "text-destructive" : "text-success")}>
                            {isCancelled ? "vừa hủy đơn hàng" : "vừa bán đơn hàng"}
                          </span>{" "}
                          với giá trị{" "}
                          <span className="font-semibold">{formatCurrency(activity.totalAmount)}</span>
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {activity.at ? formatRelativeTime(activity.at) : ""}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-muted-foreground">Chưa có hoạt động nào</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {isAdmin && (
          <Card>
            <CardHeader className="flex-row items-start justify-between gap-2 space-y-0">
              <CardTitle>Doanh thu theo chi nhánh</CardTitle>
              <PeriodSelect period={branchPeriod} />
            </CardHeader>
            <CardContent className="flex h-64 items-center gap-6">
              {branchComparison?.length ? (
                <>
                  <div className="relative h-full flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={branchComparison}
                          dataKey="revenue"
                          nameKey="branchName"
                          innerRadius="64%"
                          outerRadius="92%"
                          paddingAngle={2}
                          stroke="none"
                        >
                          {branchComparison.map((entry, i) => (
                            <Cell key={entry.branchId} fill={BRANCH_COLORS[i % BRANCH_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<ChartTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-xs text-muted-foreground">Tổng</span>
                      <MoneyValue value={branchTotal} className="text-base font-semibold" />
                    </div>
                  </div>
                  <div className="min-w-[150px] space-y-3 text-sm">
                    {branchComparison.map((b, i) => (
                      <div key={b.branchId} className="flex items-center gap-2.5">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: BRANCH_COLORS[i % BRANCH_COLORS.length] }}
                        />
                        <div className="min-w-0">
                          <p className="truncate font-medium leading-tight">{b.branchName}</p>
                          <p className="text-xs tabular-nums text-muted-foreground">{formatCompact(b.revenue)}</p>
                        </div>
                        <span className="ml-auto shrink-0 font-semibold tabular-nums">
                          {branchTotal > 0 ? Math.round((b.revenue / branchTotal) * 100) : 0}%
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className={EMPTY_CLASS}>Chưa có dữ liệu</p>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex-row items-start justify-between gap-2 space-y-0">
            <CardTitle>Top nhân viên bán tốt</CardTitle>
            <PeriodSelect period={sellerPeriod} />
          </CardHeader>
          <CardContent>
            {sellerData.length ? (
              <RankedBars items={sellerData} formatLabel={formatCompact} formatTooltip={formatFull} />
            ) : (
              <p className={EMPTY_CLASS}>Chưa có dữ liệu</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-start justify-between gap-2 space-y-0">
            <CardTitle>Top 10 hàng bán chạy</CardTitle>
            <div className="flex items-center gap-2">
              <Select value={productMetric} onValueChange={(v) => setProductMetric(v as "revenue" | "quantity")}>
                <SelectTrigger className="h-8 w-[185px] shrink-0 whitespace-nowrap text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="revenue">Theo doanh thu thuần</SelectItem>
                  <SelectItem value="quantity">Theo số lượng</SelectItem>
                </SelectContent>
              </Select>
              <PeriodSelect period={productsPeriod} />
            </div>
          </CardHeader>
          <CardContent>
            {topProductsData.length ? (
              <RankedBars
                items={topProductsData}
                formatLabel={productMetric === "quantity" ? String : formatCompact}
                formatTooltip={productMetric === "quantity" ? String : formatFull}
              />
            ) : (
              <p className={EMPTY_CLASS}>Chưa có dữ liệu</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-start justify-between gap-2 space-y-0">
            <CardTitle>Top 10 khách mua nhiều nhất</CardTitle>
            <PeriodSelect period={customersPeriod} />
          </CardHeader>
          <CardContent>
            {topCustomersData.length ? (
              <RankedBars items={topCustomersData} formatLabel={formatCompact} formatTooltip={formatFull} />
            ) : (
              <p className={EMPTY_CLASS}>Chưa có dữ liệu</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
