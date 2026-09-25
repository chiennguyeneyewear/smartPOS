import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowDownRight, ArrowUpRight, ReceiptText, RotateCcw, Wallet } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/shared/date-picker";
import { formatCurrency, formatRelativeTime } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
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

const BRANCH_COLORS = ["hsl(var(--primary))", "#f97316", "#eab308", "#22c55e", "#a855f7", "#ec4899"];

function truncateLabel(value: string, max = 22) {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

type ChartMode = "day" | "hour" | "weekday";

const CHART_TABS: { value: ChartMode; label: string }[] = [
  { value: "day", label: "Theo ngày" },
  { value: "hour", label: "Theo giờ" },
  { value: "weekday", label: "Theo thứ" },
];

function toDateInputValue(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function ChangeBadge({ pct }: { pct: number }) {
  const isUp = pct >= 0;
  const Icon = isUp ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-xs font-medium", isUp ? "text-success" : "text-destructive")}>
      <Icon className="h-3.5 w-3.5" />
      {Math.abs(pct).toFixed(2)}%
    </span>
  );
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
  const customersPeriod = useCardPeriod(preset, customFrom, customTo);

  const { data: topProducts } = useTopProductsReport({
    branchId: reportBranchId,
    from: productsPeriod.fromIso,
    to: productsPeriod.toIso,
    limit: 10,
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
    () => (topProducts ?? []).map((p) => ({ ...p, label: truncateLabel(p.name) })),
    [topProducts],
  );
  const topCustomersData = useMemo(
    () => (topCustomers ?? []).map((c) => ({ ...c, label: truncateLabel(c.name) })),
    [topCustomers],
  );
  const topChartHeight = Math.max(240, Math.max(topProductsData.length, topCustomersData.length) * 36);

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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
            <div>
              <CardDescription>Doanh thu</CardDescription>
              <CardTitle className="text-xl">{formatCurrency(summary?.revenue ?? 0)}</CardTitle>
              <p className="text-xs text-muted-foreground">{summary?.invoiceCount ?? 0} hóa đơn</p>
            </div>
            <Wallet className="h-8 w-8 text-primary/70" />
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
            <div>
              <CardDescription>Đơn hủy</CardDescription>
              <CardTitle className="text-xl">{summary?.cancelledCount ?? 0}</CardTitle>
              <p className="text-xs text-muted-foreground">{periodLabel}</p>
            </div>
            <RotateCcw className="h-8 w-8 text-muted-foreground/60" />
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="space-y-1">
            <CardDescription>Doanh thu</CardDescription>
            <ChangeBadge pct={summary?.changeVsPreviousPct ?? 0} />
            <p className="text-xs text-muted-foreground">So với kỳ trước</p>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-start justify-between gap-2 space-y-0">
          <CardTitle>Lợi nhuận</CardTitle>
          <PeriodSelect period={profitPeriod} />
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-lg bg-primary p-4 text-primary-foreground">
            <p className="text-sm opacity-90">Lợi nhuận</p>
            <p className="mt-1 text-xl font-bold">{formatCurrency(profit?.profit ?? 0)}</p>
          </div>
          <div className="rounded-lg p-4 text-white" style={{ backgroundColor: "#f97316" }}>
            <p className="text-sm opacity-90">Doanh thu</p>
            <p className="mt-1 text-xl font-bold">{formatCurrency(profit?.revenue ?? 0)}</p>
          </div>
          <div className="rounded-lg p-4 text-white" style={{ backgroundColor: "#eab308" }}>
            <p className="text-sm opacity-90">Giá vốn</p>
            <p className="mt-1 text-xl font-bold">{formatCurrency(profit?.cost ?? 0)}</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
            <div>
              <CardDescription>Doanh thu thuần</CardDescription>
              <CardTitle className="text-xl">{formatCurrency(summary?.revenue ?? 0)}</CardTitle>
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
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="period" fontSize={12} />
                <YAxis fontSize={12} tickFormatter={(v) => `${v / 1_000_000} tr`} />
                <Tooltip formatter={(value: number) => [formatCurrency(value), "Doanh thu"]} />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
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
            <CardContent className="flex h-72 items-center gap-4">
              {branchComparison?.length ? (
                <>
                  <div className="relative h-full flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={branchComparison}
                          dataKey="revenue"
                          nameKey="branchName"
                          innerRadius="60%"
                          outerRadius="90%"
                          paddingAngle={2}
                        >
                          {branchComparison.map((entry, i) => (
                            <Cell key={entry.branchId} fill={BRANCH_COLORS[i % BRANCH_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => [formatCurrency(value), "Doanh thu"]} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-xs text-muted-foreground">Tổng</span>
                      <span className="text-sm font-semibold">{formatCurrency(branchTotal)}</span>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    {branchComparison.map((b, i) => (
                      <div key={b.branchId} className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: BRANCH_COLORS[i % BRANCH_COLORS.length] }}
                        />
                        <span className="truncate">{b.branchName}</span>
                        <span className="ml-auto shrink-0 font-medium">
                          {branchTotal > 0 ? Math.round((b.revenue / branchTotal) * 100) : 0}%
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Chưa có dữ liệu</p>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex-row items-start justify-between gap-2 space-y-0">
            <CardTitle>Top nhân viên bán tốt</CardTitle>
            <PeriodSelect period={sellerPeriod} />
          </CardHeader>
          <CardContent className="h-72">
            {sellerPerformance?.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={sellerPerformance.map((s) => ({ ...s, label: truncateLabel(s.username) }))}
                  layout="vertical"
                  margin={{ left: 8, right: 24 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                  <XAxis type="number" fontSize={12} tickFormatter={(v) => `${v / 1_000_000} tr`} />
                  <YAxis type="category" dataKey="label" width={80} fontSize={12} />
                  <Tooltip formatter={(value: number) => [formatCurrency(value), "Doanh thu"]} />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground">Chưa có dữ liệu</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-start justify-between gap-2 space-y-0">
            <CardTitle>Top 10 hàng bán chạy</CardTitle>
            <PeriodSelect period={productsPeriod} />
          </CardHeader>
          <CardContent style={{ height: topChartHeight }}>
            {topProductsData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProductsData} layout="vertical" margin={{ left: 8, right: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                  <XAxis type="number" fontSize={12} tickFormatter={(v) => `${v / 1_000_000} tr`} />
                  <YAxis type="category" dataKey="label" width={140} fontSize={12} />
                  <Tooltip formatter={(value: number) => [formatCurrency(value), "Doanh thu"]} />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground">Chưa có dữ liệu</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-start justify-between gap-2 space-y-0">
            <CardTitle>Top 10 khách mua nhiều nhất</CardTitle>
            <PeriodSelect period={customersPeriod} />
          </CardHeader>
          <CardContent style={{ height: topChartHeight }}>
            {topCustomersData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topCustomersData} layout="vertical" margin={{ left: 8, right: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                  <XAxis type="number" fontSize={12} tickFormatter={(v) => `${v / 1_000_000} tr`} />
                  <YAxis type="category" dataKey="label" width={140} fontSize={12} />
                  <Tooltip formatter={(value: number) => [formatCurrency(value), "Doanh thu"]} />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground">Chưa có dữ liệu</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
