import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { cn } from "@/lib/utils";

const numberFormat = new Intl.NumberFormat("vi-VN");

function trimDecimal(n: number) {
  return (Math.round(n * 10) / 10).toString().replace(".", ",");
}

// 6.020.001 -> "6 tr", 1.250.000.000 -> "1,3 tỷ": short enough for axis ticks and bar labels.
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

function formatPeriodTick(period: string): string {
  const day = period.match(/^\d{4}-(\d{2})-(\d{2})$/);
  if (day) return `${day[2]}/${day[1]}`;
  const month = period.match(/^(\d{4})-(\d{2})$/);
  if (month) return `${month[2]}/${month[1]}`;
  const hour = period.match(/^(\d{2}):00$/);
  if (hour) return `${Number(hour[1])}h`;
  return period;
}

function formatPeriodFull(period: string): string {
  const day = period.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (day) return `${day[3]}/${day[2]}/${day[1]}`;
  const hour = period.match(/^(\d{2}):00$/);
  if (hour) return `${hour[1]}:00 - ${hour[1]}:59`;
  return period;
}

interface TooltipPayloadItem {
  value?: number;
  name?: string | number;
  payload?: { period?: string; label?: string; branchName?: string };
}

export function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string | number;
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0]!;
  const title = String(item.payload?.branchName ?? item.payload?.label ?? label ?? item.name ?? "");
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-lg">
      <p className="text-muted-foreground">{formatPeriodFull(title)}</p>
      <p className="mt-1 text-sm font-semibold">
        <MoneyValue value={item.value ?? 0} />
      </p>
      <p className="mt-0.5 text-muted-foreground">Doanh thu</p>
    </div>
  );
}

const TICK = { fontSize: 11, fill: "hsl(var(--muted-foreground))" };

// Vertical columns over time. Bars are capped in width so a period with only a
// couple of buckets doesn't turn into one giant slab.
export function ColumnBars({ data, gradientId }: { data: { period: string; revenue: number }[]; gradientId: string }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barCategoryGap="30%">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={1} />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.55} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 5" stroke="hsl(var(--border))" />
        <XAxis
          dataKey="period"
          tick={TICK}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={14}
          tickFormatter={formatPeriodTick}
        />
        <YAxis tick={TICK} tickLine={false} axisLine={false} width={48} tickFormatter={formatCompact} />
        <Tooltip cursor={{ fill: "hsl(var(--muted))", opacity: 0.6 }} content={<ChartTooltip />} />
        <Bar dataKey="revenue" maxBarSize={26} radius={[6, 6, 0, 0]} fill={`url(#${gradientId})`} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// Ranked horizontal bars: slim bars on a faint track with the value written at
// the end, sized by row count instead of stretching to fill the card.
export function HorizontalBars({
  data,
  gradientId,
}: {
  data: { label: string; revenue: number }[];
  gradientId: string;
}) {
  const height = Math.max(140, data.length * 40 + 12);
  const max = Math.max(...data.map((d) => d.revenue), 1);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 2, right: 52, bottom: 2, left: 0 }} barCategoryGap={14}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.6} />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={1} />
          </linearGradient>
        </defs>
        <XAxis type="number" hide domain={[0, max]} />
        <YAxis
          type="category"
          dataKey="label"
          width={120}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12, fill: "hsl(var(--foreground))" }}
        />
        <Tooltip cursor={false} content={<ChartTooltip />} />
        <Bar
          dataKey="revenue"
          barSize={12}
          radius={[0, 6, 6, 0]}
          fill={`url(#${gradientId})`}
          background={{ fill: "hsl(var(--muted))" }}
        >
          <LabelList
            dataKey="revenue"
            position="right"
            formatter={(v: number) => formatCompact(v)}
            style={{ fontSize: 11, fontWeight: 600, fill: "hsl(var(--muted-foreground))" }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
