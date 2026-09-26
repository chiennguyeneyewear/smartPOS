import { useEffect, useMemo, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { ArrowDownRight, ArrowUpRight, ReceiptText, RotateCcw } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

function StatTile({
  label,
  gradient,
  sub,
  children,
}: {
  label: string;
  gradient: string;
  sub?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("rounded-xl bg-gradient-to-br p-4 text-white shadow-sm", gradient)}>
      <p className="text-xs font-medium uppercase tracking-wider text-white/80">{label}</p>
      <div className="mt-2">{children}</div>
      {sub && <p className="mt-1 text-xs text-white/80">{sub}</p>}
    </div>
  );
}

// Each widget can override the page-wide period without touching the others;
// changing the page-wide selector resets every widget back to following it.
function useCardPeriod(globalPreset: PeriodPreset, customFrom: string, customTo: string) {
  const [override, setOverride] = useState<PeriodPreset | null>(null);
  // Dates picked for this card alone; null = use the page-wide custom dates.
  const [own, setOwn] = useState<{ from: string; to: string } | null>(null);
  useEffect(() => {
    setOverride(null);
    setOwn(null);
  }, [globalPreset, customFrom, customTo]);
  const preset = override ?? globalPreset;
  const from = own?.from ?? customFrom;
  const to = own?.to ?? customTo;
  const range = useMemo(() => getPeriodRange(preset, { from, to }), [preset, from, to]);
  return {
    preset,
    setPreset: setOverride,
    customFrom: from,
    customTo: to,
    setCustom: (f: string, t: string) => {
      setOwn({ from: f, to: t });
      setOverride("custom");
    },
    fromIso: range.from.toISOString(),
    toIso: range.to.toISOString(),
    label: formatPeriodLabel(preset, range),
  };
}

function PeriodSelect({
  period,
}: {
  period: {
    preset: PeriodPreset;
    setPreset: (p: PeriodPreset) => void;
    label: string;
    customFrom: string;
    customTo: string;
    setCustom: (from: string, to: string) => void;
  };
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [draftFrom, setDraftFrom] = useState(period.customFrom);
  const [draftTo, setDraftTo] = useState(period.customTo);
  const options = PERIOD_PRESET_OPTIONS;

  function choose(value: PeriodPreset) {
    if (value === "custom") {
      setDraftFrom(period.customFrom);
      setDraftTo(period.customTo);
      setPickerOpen(true);
    } else {
      period.setPreset(value);
    }
  }

  return (
    <>
    <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
      <DialogContent className="max-w-sm overflow-visible">
        <DialogHeader>
          <DialogTitle>Chọn khoảng thời gian</DialogTitle>
        </DialogHeader>
        <div className="flex items-center gap-2">
          <DatePicker value={draftFrom} onChange={setDraftFrom} className="flex-1" />
          <span className="text-sm text-muted-foreground">-</span>
          <DatePicker value={draftTo} onChange={setDraftTo} className="flex-1" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setPickerOpen(false)}>
            Bỏ qua
          </Button>
          <Button
            disabled={draftFrom > draftTo}
            onClick={() => {
              period.setCustom(draftFrom, draftTo);
              setPickerOpen(false);
            }}
          >
            Áp dụng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <Select value={period.preset} onValueChange={(v) => choose(v as PeriodPreset)}>
      <SelectTrigger className="h-8 w-auto min-w-[150px] shrink-0 gap-2 whitespace-nowrap text-xs">
        <SelectValue>{period.label}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
    </>
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

  const { data: profit } = useProfitReport({ branchId: reportBranchId, from: fromIso, to: toIso });
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
  // Every tile in the row follows the page-wide period: revenue/cancellations/growth come from the
  // dashboard summary, cost from the profit report, and profit is derived so it always equals
  // the revenue shown next to it (invoice-level discounts included).
  const rowRevenue = summary?.revenue ?? 0;
  const rowCost = profit?.cost ?? 0;
  const rowProfit = rowRevenue - rowCost;
  const profitMargin = rowRevenue > 0 ? (rowProfit / rowRevenue) * 100 : 0;
  const growthPct = summary?.changeVsPreviousPct ?? 0;

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
        <CardContent className="grid grid-cols-2 gap-3 pt-4 sm:grid-cols-3 lg:grid-cols-5">
          <StatTile label="Doanh thu" gradient="from-primary to-primary/75" sub={`${summary?.invoiceCount ?? 0} hóa đơn`}>
            <MoneyValue value={rowRevenue} className="text-xl font-semibold" />
          </StatTile>
          <StatTile label="Đơn hủy" gradient="from-rose-500 to-rose-400" sub="đơn trong kỳ">
            <span className="text-xl font-semibold tabular-nums tracking-tight">{summary?.cancelledCount ?? 0}</span>
          </StatTile>
          <StatTile label="Giá vốn" gradient="from-amber-500 to-yellow-400">
            <MoneyValue value={rowCost} className="text-xl font-semibold" />
          </StatTile>
          <StatTile
            label="Lợi nhuận"
            gradient="from-emerald-600 to-emerald-500"
            sub={`Biên lợi nhuận ${profitMargin.toFixed(1).replace(".", ",")}%`}
          >
            <MoneyValue value={rowProfit} className="text-xl font-semibold" />
          </StatTile>
          <StatTile
            label="Tăng trưởng doanh thu"
            gradient={growthPct >= 0 ? "from-violet-600 to-violet-500" : "from-slate-600 to-slate-500"}
            sub="So với kỳ trước"
          >
            <span className="inline-flex items-center gap-1 text-xl font-semibold tabular-nums tracking-tight">
              {growthPct >= 0 ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownRight className="h-5 w-5" />}
              {Math.abs(growthPct).toFixed(2).replace(".", ",")}%
            </span>
          </StatTile>
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
