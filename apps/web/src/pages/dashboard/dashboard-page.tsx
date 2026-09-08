import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowDownRight, ArrowUpRight, Cake, ReceiptText, RotateCcw, Wallet } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/shared/date-picker";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import { useDashboardSummary, useRevenueReport } from "@/features/reports/hooks";
import { PERIOD_PRESET_OPTIONS, formatPeriodLabel, getPeriodRange, type PeriodPreset } from "./period-presets";

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

export function DashboardPage() {
  const activeBranchId = useAuthStore((s) => s.activeBranchId);
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

  const { data: summary } = useDashboardSummary({ branchId: activeBranchId ?? undefined, from: fromIso, to: toIso });
  const { data: revenue } = useRevenueReport({
    branchId: activeBranchId ?? undefined,
    groupBy: chartMode,
    from: fromIso,
    to: toIso,
  });

  const chartData = useMemo(() => revenue ?? [], [revenue]);

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
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {!!summary?.birthdaysToday?.length && (
            <Card>
              <CardHeader className="flex-row items-center gap-2 space-y-0">
                <Cake className="h-5 w-5 text-primary" />
                <CardTitle>
                  Có {summary.birthdaysToday.length} khách hàng sinh nhật hôm nay
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm text-muted-foreground">
                {summary.birthdaysToday.map((c) => (
                  <p key={c.id}>{c.name}</p>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Hoạt động gần đây</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {summary?.recentActivities.length ? (
                summary.recentActivities.map((activity) => {
                  const isCancelled = activity.type === "CANCELLED";
                  const Icon = isCancelled ? RotateCcw : ReceiptText;
                  return (
                    <div key={`${activity.type}-${activity.id}`} className="flex items-start gap-2 border-b pb-2 text-sm last:border-0 last:pb-0">
                      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", isCancelled ? "text-destructive" : "text-muted-foreground")} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate">
                          <span className="font-medium">{activity.userName}</span>{" "}
                          {isCancelled ? "vừa hủy đơn hàng" : "vừa bán đơn hàng"} của{" "}
                          <span className="font-medium">{activity.customerName}</span> với giá trị{" "}
                          <span className="font-medium">{formatCurrency(activity.totalAmount)}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {activity.code} · {activity.at ? formatDateTime(activity.at) : ""}
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
    </div>
  );
}
