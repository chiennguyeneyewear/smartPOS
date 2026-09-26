import { useState } from "react";
import { Line, LineChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BarChart3, Loader2 } from "lucide-react";
import type { ProductSummary } from "@smartpos/shared";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import { useBranches } from "@/features/branches/hooks";
import { useProductAnalysis } from "@/features/reports/hooks";
import type { ProductAnalysis } from "@/features/reports/api";

const PERIODS = [
  { days: 30, label: "30 ngày qua" },
  { days: 90, label: "3 tháng qua" },
  { days: 180, label: "6 tháng qua" },
  { days: 365, label: "12 tháng qua" },
] as const;

const GREEN = "#22c55e";
const ORANGE = "#fb9a2a";
const BLUE = "#0070f4";
const GRAY = "#b8bcc4";

const fmt = (n: number) => Math.round(n).toLocaleString("en-US");
const fmtQty = (n: number) => (Number.isInteger(n) ? n.toLocaleString("en-US") : n.toLocaleString("en-US", { maximumFractionDigits: 3 }));

// Axis labels the way KiotViet abbreviates them: 800N (nghìn), 1.2Tr (triệu), 1.5Tỷ.
function axisLabel(v: number): string {
  const abs = Math.abs(v);
  const trim = (n: number) => String(Math.round(n * 10) / 10);
  if (abs >= 1e9) return `${trim(v / 1e9)}Tỷ`;
  if (abs >= 1e6) return `${trim(v / 1e6)}Tr`;
  if (abs >= 1e3) return `${trim(v / 1e3)}N`;
  return String(Math.round(v));
}

// "2026-09-12" -> "12/09"; "2026-09" -> "09/2026"
function periodLabel(p: string): string {
  if (p.length === 7) return `${p.slice(5)}/${p.slice(0, 4)}`;
  return `${p.slice(8, 10)}/${p.slice(5, 7)}`;
}

function formatVnDate(iso: string): string {
  const d = new Date(new Date(iso).getTime() + 7 * 3600_000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getUTCDate())}/${p(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
}

function formatVnDateTime(iso: string): string {
  const d = new Date(new Date(iso).getTime() + 7 * 3600_000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())} ${formatVnDate(iso)}`;
}

function Sparkline({ values, color }: { values: number[]; color: string }) {
  const flat = values.every((v) => v === 0);
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={values.map((v, i) => ({ i, v }))} margin={{ top: 4, right: 2, bottom: 4, left: 2 }}>
        <Line type="monotone" dataKey="v" stroke={flat ? GRAY : color} strokeWidth={1.5} dot={false} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "green" }) {
  return (
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={cn("mt-0.5 text-sm font-semibold", tone === "green" && "text-emerald-600")}>{value}</p>
    </div>
  );
}

function KpiCard({
  label,
  value,
  spark,
  color,
  stats,
}: {
  label: string;
  value: number;
  spark: number[];
  color: string;
  stats: [string, string][];
}) {
  return (
    <div className="rounded-xl border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{fmt(value)}</p>
        </div>
        <div className="h-12 w-[42%] min-w-[90px] shrink-0">
          <Sparkline values={spark} color={color} />
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        {stats.map(([l, v]) => (
          <Stat key={l} label={l} value={v} tone="green" />
        ))}
      </div>
    </div>
  );
}

function ChartCard({
  title,
  data,
  lines,
}: {
  title: string;
  data: ProductAnalysis["series"];
  lines: { key: keyof ProductAnalysis["series"][number]; name: string; color: string }[];
}) {
  return (
    <div className="rounded-xl border p-4">
      <p className="text-base font-semibold">{title}</p>
      <div className="mt-4 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="#ececec" vertical={false} />
            <XAxis
              dataKey="period"
              tickFormatter={periodLabel}
              tick={{ fontSize: 11, fill: "#6b7280" }}
              tickLine={false}
              axisLine={{ stroke: "#e5e7eb" }}
              minTickGap={28}
            />
            <YAxis
              tickFormatter={axisLabel}
              tick={{ fontSize: 11, fill: "#6b7280" }}
              tickLine={false}
              axisLine={false}
              width={48}
              allowDecimals={false}
            />
            <Tooltip
              labelFormatter={(l) => periodLabel(String(l))}
              formatter={(v: number, name: string) => [`${fmt(v)}đ`, name]}
              contentStyle={{ borderRadius: 8, fontSize: 12 }}
            />
            {lines.map((l) => (
              <Line
                key={l.key}
                type="monotone"
                dataKey={l.key}
                name={l.name}
                stroke={l.color}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex flex-wrap justify-center gap-x-5 gap-y-1 text-xs text-muted-foreground">
        {lines.map((l) => (
          <span key={l.key} className="flex items-center gap-1.5">
            <span className="h-1 w-3 rounded" style={{ background: l.color }} />
            {l.name}
          </span>
        ))}
      </div>
    </div>
  );
}

const TH = "px-3 py-2.5 text-sm font-semibold";

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-14 text-sm text-muted-foreground">
      <span className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary">
        <BarChart3 className="h-9 w-9" />
      </span>
      Chưa có dữ liệu
    </div>
  );
}

export function ProductAnalysisDialog({
  product,
  onClose,
}: {
  product: ProductSummary | null;
  onClose: () => void;
}) {
  const user = useAuthStore((s) => s.user);
  const activeBranchId = useAuthStore((s) => s.activeBranchId);
  const isAdmin = user?.role === "admin";
  const { data: allBranches } = useBranches();
  const allowedIds = new Set((user?.branches ?? []).map((b) => b.id));
  const branches = (allBranches ?? []).filter((b) => isAdmin || allowedIds.has(b.id));

  const [days, setDays] = useState<number>(30);
  // "all" = every branch (admin only); anyone else is pinned to a specific branch.
  const [branch, setBranch] = useState<string>("all");
  const effectiveBranch = isAdmin ? (branch === "all" ? undefined : branch) : branch === "all" ? (activeBranchId ?? undefined) : branch;

  const { data, isLoading, isError } = useProductAnalysis(
    { productId: product?.id ?? "", days, branchId: effectiveBranch },
    !!product,
  );

  const t = data?.totals;
  const spark = (key: "revenue" | "cost" | "profit") => data?.series.map((s) => s[key]) ?? [];

  return (
    <Dialog open={!!product} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl gap-0 p-0">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle className="text-lg">Phân tích hàng hóa</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {PERIODS.map((p) => (
                <Button
                  key={p.days}
                  type="button"
                  size="sm"
                  variant={days === p.days ? "default" : "outline"}
                  onClick={() => setDays(p.days)}
                >
                  {p.label}
                </Button>
              ))}
            </div>
            <Select value={branch} onValueChange={setBranch}>
              <SelectTrigger className="w-[190px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {isAdmin && <SelectItem value="all">Tất cả chi nhánh</SelectItem>}
                {!isAdmin && <SelectItem value="all">Chi nhánh hiện tại</SelectItem>}
                {branches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <p className="text-base font-semibold">{product?.name}</p>
            <p className="mt-1 text-sm text-muted-foreground">Mã hàng: {product?.sku}</p>
          </div>

          {isLoading && (
            <div className="flex justify-center py-24">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
          {isError && <p className="py-16 text-center text-sm text-destructive">Không tải được dữ liệu phân tích</p>}

          {data && t && (
            <>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <KpiCard
                  label="Tổng doanh thu"
                  value={t.revenue}
                  spark={spark("revenue")}
                  color={GREEN}
                  stats={[
                    ["Số lượng bán", fmtQty(t.quantity)],
                    ["Trung bình/sản phẩm", fmt(t.averagePerUnit)],
                  ]}
                />
                <KpiCard
                  label="Giá trị trả"
                  value={t.returnValue}
                  spark={data.series.map(() => 0)}
                  color={GREEN}
                  stats={[
                    ["Số lượng trả", fmtQty(t.returnQuantity)],
                    ["Tỷ lệ trả", `${Math.round(t.returnRate * 100)} %`],
                  ]}
                />
                <KpiCard
                  label="Tổng giá vốn"
                  value={t.cost}
                  spark={spark("cost")}
                  color={ORANGE}
                  stats={[["Trung bình/sản phẩm", fmt(t.averageCostPerUnit)]]}
                />
                <KpiCard
                  label="Lợi nhuận gộp"
                  value={t.profit}
                  spark={spark("profit")}
                  color={GREEN}
                  stats={[
                    ["Trung bình/sản phẩm", fmt(t.averageProfitPerUnit)],
                    ["Tỷ suất lợi nhuận", `${Math.round(t.margin * 100)} %`],
                  ]}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <ChartCard
                  title="Chỉ số kinh doanh"
                  data={data.series}
                  lines={[
                    { key: "revenue", name: "Doanh thu thuần", color: BLUE },
                    { key: "cost", name: "Tổng giá vốn", color: ORANGE },
                    { key: "profit", name: "Lợi nhuận gộp", color: GREEN },
                  ]}
                />
                <ChartCard
                  title="Giá vốn và giá bán"
                  data={data.series}
                  lines={[
                    { key: "price", name: "Giá bán", color: GREEN },
                    { key: "unitCost", name: "Giá vốn", color: ORANGE },
                  ]}
                />
              </div>

              <div className="rounded-xl border p-4">
                <p className="mb-3 text-base font-semibold">Kênh bán</p>
                {data.channels.length === 0 ? (
                  <EmptyState />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/60">
                        <tr>
                          <th className={cn(TH, "w-14 text-center")}>STT</th>
                          <th className={cn(TH, "text-left")}>Kênh bán</th>
                          <th className={cn(TH, "text-right")}>Số lượng</th>
                          <th className={cn(TH, "text-right")}>Doanh thu thuần</th>
                          <th className={cn(TH, "text-right")}>Tỉ lệ</th>
                          <th className={cn(TH, "w-40 text-left")}>Xu hướng</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.channels.map((c, i) => (
                          <tr key={c.name} className="border-b last:border-0">
                            <td className="px-3 py-2.5 text-center">{i + 1}</td>
                            <td className="px-3 py-2.5">{c.name}</td>
                            <td className="px-3 py-2.5 text-right">{fmtQty(c.quantity)}</td>
                            <td className="px-3 py-2.5 text-right">{fmt(c.revenue)}</td>
                            <td className="px-3 py-2.5 text-right">{Math.round(c.share * 100)} %</td>
                            <td className="h-10 px-3 py-1.5">
                              <div className="h-8 w-36">
                                <Sparkline values={c.trend} color={GREEN} />
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="rounded-xl border p-4">
                <p className="mb-3 text-base font-semibold">Khách hàng thường xuyên</p>
                {data.customers.length === 0 ? (
                  <EmptyState />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/60">
                        <tr>
                          <th className={cn(TH, "w-14 text-center")}>STT</th>
                          <th className={cn(TH, "text-left")}>Tên khách hàng</th>
                          <th className={cn(TH, "text-right")}>Số lượng</th>
                          <th className={cn(TH, "text-right")}>Doanh thu thuần</th>
                          <th className={cn(TH, "text-right")}>Lần cuối mua</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.customers.map((c, i) => (
                          <tr key={c.id} className="border-b last:border-0">
                            <td className="px-3 py-2.5 text-center">{i + 1}</td>
                            <td className="px-3 py-2.5">{c.name}</td>
                            <td className="px-3 py-2.5 text-right">{fmtQty(c.quantity)}</td>
                            <td className="px-3 py-2.5 text-right">{fmt(c.revenue)}</td>
                            <td className="px-3 py-2.5 text-right">{formatVnDate(c.lastPurchase)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="rounded-xl border p-4">
                <p className="text-base font-semibold">Khách hàng tiềm năng</p>
                <EmptyState />
              </div>

              <p className="text-xs text-muted-foreground">
                Dữ liệu được tổng hợp đến {formatVnDateTime(data.generatedAt)} (UTC+07:00)
              </p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
