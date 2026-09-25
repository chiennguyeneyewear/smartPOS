import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { cn } from "@/lib/utils";

export const CHART_BLUE = "#0070f4";
const CHART_BLUE_HOVER = "#4da3ff";
const GRID_COLOR = "#ececec";

const numberFormat = new Intl.NumberFormat("vi-VN");

function trimDecimal(n: number) {
  return String(Math.round(n * 10) / 10);
}

// 52.500.000 -> "52.5 tr", 1.250.000.000 -> "1.3 tỷ": short enough for axis ticks and bar labels.
export function formatCompact(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1e9) return `${trimDecimal(value / 1e9)} tỷ`;
  if (abs >= 1e6) return `${trimDecimal(value / 1e6)} tr`;
  if (abs >= 1e3) return `${trimDecimal(value / 1e3)}k`;
  return String(Math.round(value));
}

// Number in the page's display weight with a quiet "₫" suffix, so the eye lands
// on the digits instead of the currency sign.
export function MoneyValue({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn("tabular-nums tracking-tight", className)}>
      {numberFormat.format(Math.round(value))}
      <span className="ml-1 text-[0.55em] font-medium opacity-60">₫</span>
    </span>
  );
}

export function formatFull(value: number): string {
  return numberFormat.format(Math.round(value));
}

// Blue pill shown on hover, shared by every chart.
export function TooltipPill({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn("whitespace-nowrap rounded-lg px-2.5 py-1 text-xs font-bold text-white shadow-lg", className)}
      style={{ backgroundColor: CHART_BLUE }}
    >
      {children}
    </div>
  );
}

interface TooltipPayloadItem {
  value?: number;
  name?: string | number;
  payload?: { branchName?: string };
}

export function ChartTooltip({
  active,
  payload,
  seriesLabel,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  seriesLabel?: string;
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0]!;
  const name = seriesLabel ?? item.payload?.branchName ?? String(item.name ?? "");
  return (
    <TooltipPill>
      {name}: {formatFull(item.value ?? 0)} ₫
    </TooltipPill>
  );
}

function formatPeriodTick(period: string, sameMonth: boolean): string {
  const day = period.match(/^\d{4}-(\d{2})-(\d{2})$/);
  if (day) return sameMonth ? day[2]! : `${day[2]}/${day[1]}`;
  const month = period.match(/^(\d{4})-(\d{2})$/);
  if (month) return `${month[2]}/${month[1]}`;
  const hour = period.match(/^(\d{2}):00$/);
  if (hour) return `${Number(hour[1])}h`;
  return period;
}

// Ten even steps from 0 so the axis reads like 0, 7, 14 ... 70 tr, topping out just above the tallest bar.
function buildTicks(max: number) {
  if (max <= 0) return { ticks: [0, 1], top: 1 };
  const unit = Math.max(1, 10 ** (Math.floor(Math.log10(max)) - 1));
  const step = Math.ceil(max / 10 / unit) * unit;
  return { ticks: Array.from({ length: 11 }, (_, i) => i * step), top: step * 10 };
}

const TICK = { fontSize: 11, fill: "#6b7280" };

// Vertical columns over time: solid blue, light horizontal grid, day-of-month labels.
export function ColumnBars({ data }: { data: { period: string; revenue: number }[] }) {
  const { ticks, top } = buildTicks(Math.max(0, ...data.map((d) => d.revenue)));
  const sameMonth =
    data.length > 0 && data[0]!.period.slice(0, 7) === data[data.length - 1]!.period.slice(0, 7);
  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barCategoryGap="45%">
            <CartesianGrid vertical={false} stroke={GRID_COLOR} />
            <XAxis
              dataKey="period"
              tick={TICK}
              tickLine={false}
              axisLine={{ stroke: "#d4d4d8" }}
              tickMargin={8}
              interval="preserveStartEnd"
              minTickGap={6}
              tickFormatter={(v: string) => formatPeriodTick(v, sameMonth)}
            />
            <YAxis
              tick={TICK}
              tickLine={false}
              axisLine={false}
              width={48}
              interval={0}
              domain={[0, top]}
              ticks={ticks}
              tickFormatter={formatCompact}
            />
            <Tooltip cursor={false} content={<ChartTooltip seriesLabel="Doanh thu" />} />
            <Bar dataKey="revenue" maxBarSize={32} fill={CHART_BLUE} activeBar={{ fill: CHART_BLUE_HOVER }} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        <span className="h-2 w-2" style={{ backgroundColor: CHART_BLUE }} />
        Doanh thu
      </div>
    </div>
  );
}

// Ranked bars, each with its name above a thin solid bar and the value at the end;
// hovering shows a blue "value - name" pill. Plain HTML so the label placement is exact.
export function RankedBars({
  items,
  formatLabel,
  formatTooltip,
}: {
  items: { key: string; name: string; value: number }[];
  formatLabel: (value: number) => string;
  formatTooltip: (value: number) => string;
}) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <div
      className="relative"
      style={{
        backgroundImage: `linear-gradient(to right, ${GRID_COLOR} 1px, transparent 1px)`,
        backgroundSize: "25% 100%",
        borderRight: `1px solid ${GRID_COLOR}`,
      }}
    >
      {items.map((item) => {
        const pct = (item.value / max) * 78;
        return (
          <div key={item.key} className="group relative px-1 py-2">
            <p className="truncate text-xs font-semibold uppercase text-muted-foreground">{item.name}</p>
            <div className="mt-1 flex items-center gap-2">
              <div
                className="h-5 rounded-[2px] bg-[#0070f4] transition-colors group-hover:bg-[#4da3ff]"
                style={{ width: `${pct}%`, minWidth: 2 }}
              />
              <span className="shrink-0 text-xs tabular-nums text-foreground">{formatLabel(item.value)}</span>
            </div>
            <div
              className="pointer-events-none absolute bottom-2 z-10 hidden group-hover:block"
              style={{ left: `calc(${pct}% + 12px)` }}
            >
              <TooltipPill>
                {formatTooltip(item.value)} - {item.name}
              </TooltipPill>
            </div>
          </div>
        );
      })}
    </div>
  );
}
