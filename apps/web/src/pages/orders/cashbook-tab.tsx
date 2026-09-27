import { useRef, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RecentDayPicker } from "@/components/shared/recent-day-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/stores/toast-store";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import { usePaymentsOnDay } from "@/features/sales/hooks";
import { useExpenses } from "@/features/expenses/hooks";
import { buildRows, type Row } from "@/lib/cashbook-rows";

const MIN_ROWS = 16;
const todayVn = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
const money = (n: number) => (n ? n.toLocaleString("en-US") : "");

// Fixed cash float kept in the till at each branch, printed at the top of the sheet (not part of the
// handover formula — it's just what the sheet always states for that branch).
const FIXED_CASH_BY_BRANCH: Record<string, string> = { CS1: "3 triệu", CS2: "1 triệu", CS3: "3 triệu" };

// Equal-width columns, so the sheet reads as an even grid; Ghi chú takes the rest.
const COLS = Array.from({ length: 7 }, () => "w-[14.28%]");
const cell = "border-r border-black/80 px-3 py-2 last:border-r-0";
const num = "text-center tabular-nums";

// The day's thu-chi sheet, drawn with the same columns as the paper one and filled from what the system
// recorded. It can be saved as a picture.
export function CashbookTab({
  isAdmin,
  sellers,
}: {
  isAdmin: boolean;
  sellers?: { id: string; name: string; branchIds: string[] }[];
}) {
  const username = useAuthStore((s) => s.user?.username) ?? "";
  const [date, setDate] = useState(todayVn());
  const [sellerId, setSellerId] = useState("all");
  const sheetRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);
  const { data, isLoading } = usePaymentsOnDay({ date, sellerId: isAdmin && sellerId !== "all" ? sellerId : undefined });

  // Expenses belong to a branch ("cơ sở"): the admin's seller filter maps to that seller's branches.
  const filterBranches = isAdmin && sellerId !== "all" ? (sellers?.find((s) => s.id === sellerId)?.branchIds ?? []) : [];
  const { data: expenseList } = useExpenses({ date, branchIds: filterBranches.length > 0 ? filterBranches.join(",") : undefined });
  const expenses = expenseList ?? [];

  const payments = data?.payments ?? [];
  const receiptRows = buildRows(payments);
  // receipts and expenses are independent columns, so line i carries the i-th receipt and the i-th expense
  const lineCount = Math.max(MIN_ROWS, receiptRows.length, expenses.length);
  const shown: Row[] = Array.from({ length: lineCount }, (_, i) => {
    const base = receiptRows[i] ?? { key: `blank-${i}`, cash: 0, transfer: 0, card: 0, owedAfter: 0, owedText: "", paidBalance: "", balanceParts: [], expenseText: "", expenseNote: "" };
    const e = expenses[i];
    return { ...base, expenseText: e ? `${e.amount.toLocaleString("en-US")} - ${e.payer}` : "", expenseNote: e?.content ?? "" };
  });
  const rows = receiptRows;

  const totalCash = rows.reduce((s, r) => s + r.cash, 0);
  const totalTransfer = rows.reduce((s, r) => s + r.transfer, 0);
  const totalCard = rows.reduce((s, r) => s + r.card, 0);
  const totalOwed = rows.reduce((s, r) => s + r.owedAfter, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const ds = data?.salesTotal ?? 0;
  // Only balances paid in cash count towards the cash handed over; balances paid by transfer or card do not.
  const totalBalancePaid = payments.filter((p) => p.kind === "Thu nốt").reduce((s, p) => s + p.amount, 0);
  const balanceCash = payments.filter((p) => p.kind === "Thu nốt" && p.method === "CASH").reduce((s, p) => s + p.amount, 0);
  const handover = ds - totalTransfer - totalCard - totalOwed - totalExpenses + balanceCash;

  const [y, m, d] = date.split("-");
  const sellerName = isAdmin ? (sellerId === "all" ? "Tất cả" : (sellers?.find((s) => s.id === sellerId)?.name ?? "")) : username;
  const fixedCash = FIXED_CASH_BY_BRANCH[sellerName] ?? "-";

  // Saves the sheet exactly as drawn on screen, as a PNG picture.
  async function savePng() {
    const node = sheetRef.current;
    if (!node || saving) return;
    setSaving(true);
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(node, { pixelRatio: 2, backgroundColor: "#ffffff", cacheBust: true });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `to-thu-chi-${date}.png`;
      a.click();
    } catch {
      toast({ title: "Không tải được ảnh tờ thu chi", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
        <div className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ngày</p>
          <RecentDayPicker value={date} onChange={setDate} isAdmin={isAdmin} className="w-[270px]" />
        </div>
        {isAdmin && (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Người bán</p>
            <Select value={sellerId} onValueChange={setSellerId}>
              <SelectTrigger className="h-9 w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                {sellers?.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <Button className="ml-auto gap-1.5" disabled={saving} onClick={savePng}>
          <Download className="h-4 w-4" /> {saving ? "Đang tạo ảnh..." : "Tải xuống ảnh"}
        </Button>
      </div>

      <div className="overflow-x-auto">
        <div ref={sheetRef} className="min-w-[1000px] rounded-md border-2 border-black/80 bg-white text-sm text-black">
          {/* header: four equal cells */}
          <div className="grid grid-cols-4 divide-x divide-black/80 border-b-2 border-black/80">
            {[
              ["Tiền mặt cố định", fixedCash],
              ["Doanh số cơ sở", sellerName],
              ["Ngày", d],
              ["Tháng / Năm", `${m} / ${y}`],
            ].map(([label, value]) => (
              <div key={label} className="flex flex-col items-center justify-center px-3 py-2 text-center">
                <span className="text-xs font-semibold text-black/70">{label}</span>
                <span className="text-xl font-bold leading-tight">{value}</span>
              </div>
            ))}
          </div>

          <table className="w-full table-fixed border-collapse">
            <colgroup>
              {COLS.map((w, i) => (
                <col key={i} className={w} />
              ))}
            </colgroup>
            <thead>
              <tr className="border-b-2 border-black/80 text-center font-semibold">
                <th className={cell}>Tiền mặt</th>
                <th className={cell}>Chuyển khoản</th>
                <th className={cell}>Quẹt thẻ</th>
                <th className={cell}>Sau cọc còn</th>
                <th className={cell}>Khách trả cọc</th>
                <th className={cell}>Chi tiêu</th>
                <th className={cell}>Ghi chú</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-black/50">
                    Đang tải dữ liệu...
                  </td>
                </tr>
              )}
              {!isLoading &&
                shown.map((r) => (
                  <tr key={r.key} className="h-9 border-b border-dashed border-black/50">
                    <td className={cn(cell, num)}>{money(r.cash)}</td>
                    <td className={cn(cell, num)}>{money(r.transfer)}</td>
                    <td className={cn(cell, num)}>{money(r.card)}</td>
                    <td className={cn(cell, num)}>{r.owedText}</td>
                    <td className={cn(cell, num)}>{r.paidBalance}</td>
                    <td className={cn(cell, num)}>{r.expenseText}</td>
                    <td className={cn(cell, "text-center")}>{r.expenseNote}</td>
                  </tr>
                ))}
              <tr className="border-t-2 border-black/80 font-semibold">
                <td className={cn(cell, num)}>{money(totalCash)}</td>
                <td className={cn(cell, num)}>{money(totalTransfer)}</td>
                <td className={cn(cell, num)}>{money(totalCard)}</td>
                <td className={cn(cell, num)}>{money(totalOwed)}</td>
                <td className={cn(cell, num)}>{money(totalBalancePaid)}</td>
                <td className={cn(cell, num)}>{money(totalExpenses)}</td>
                <td className={cell} />
              </tr>
            </tbody>
          </table>

          {/* footer: four equal cells */}
          <div className="grid grid-cols-4 divide-x divide-black/80 border-t-2 border-black/80">
            {[
              ["DS (doanh số)", money(ds) || "0"],
              ["+ / - Tiền", ""],
              ["Tổng tiền bàn giao", money(handover) || "0"],
              ["Người tổng kết", isAdmin ? "" : username],
            ].map(([label, value]) => (
              <div key={label} className="flex min-h-[64px] flex-col items-center justify-center px-3 py-2 text-center">
                <span className="text-xs font-semibold text-black/70">{label}</span>
                <span className="text-lg font-bold leading-tight tabular-nums">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {(data?.pending.length ?? 0) > 0 && (
        <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          {data?.pending.length} hóa đơn ra trong ngày chưa ghi nhận tiền nên chưa lên tờ:{" "}
          {data?.pending.map((p) => `${p.invoiceCode} ${p.customerName}`).join(" · ")}
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        Tiền bàn giao = DS − chuyển khoản − quẹt thẻ − sau cọc còn − chi tiêu + trả cọc còn bằng tiền mặt (trả cọc bằng
        chuyển khoản hoặc quẹt thẻ không tính).
      </p>
    </div>
  );
}
