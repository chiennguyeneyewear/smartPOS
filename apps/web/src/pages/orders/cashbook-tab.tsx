import { useRef, useState } from "react";
import { Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/shared/date-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/stores/toast-store";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import { useOpenBalances, usePaymentsOnDay } from "@/features/sales/hooks";
import type { OpenBalanceLine } from "@/features/sales/api";
import { useExpenses } from "@/features/expenses/hooks";
import { buildRows, type Row } from "@/lib/cashbook-rows";
import { printA5Pages, renderA5Png } from "@/lib/a5-sheet";
import { CashbookBack } from "./cashbook-back";

const MIN_ROWS = 16;
// Keeps a face rendered at its real width but out of sight (display:none would leave nothing to turn into a picture).
const OFF_SCREEN = "pointer-events-none absolute -left-[10000px] top-0 w-[1000px]";
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
  const [face, setFace] = useState<"front" | "back">("front");
  const sheetRef = useRef<HTMLDivElement>(null);
  const backAreaRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);
  const sellerParam = isAdmin && sellerId !== "all" ? sellerId : undefined;
  const { data, isLoading } = usePaymentsOnDay({ date, sellerId: sellerParam });

  // Expenses and the back of the sheet belong to a branch ("cơ sở"): the admin's seller filter maps to that
  // seller's branches (staff are limited to their own branches by the API).
  const filterBranches = isAdmin && sellerId !== "all" ? (sellers?.find((s) => s.id === sellerId)?.branchIds ?? []) : [];
  const branchParam = filterBranches.length > 0 ? filterBranches.join(",") : undefined;
  const { data: openBalances } = useOpenBalances({ date, branchIds: branchParam });
  const { data: expenseList } = useExpenses({ date, branchIds: branchParam });
  const expenses = expenseList ?? [];

  // Each branch writes only its own orders: one back page per branch (the admin's "Tất cả" gives one per branch
  // instead of mixing them). Always at least one (blank) page.
  const backPages = (() => {
    const byBranch = new Map<string, { branchName: string; lines: OpenBalanceLine[] }>();
    for (const line of openBalances?.lines ?? []) {
      const page = byBranch.get(line.branchId) ?? { branchName: line.branchName, lines: [] };
      page.lines.push(line);
      byBranch.set(line.branchId, page);
    }
    return byBranch.size > 0 ? [...byBranch.values()] : [{ branchName: "", lines: [] as OpenBalanceLine[] }];
  })();

  const payments = data?.payments ?? [];
  const receiptRows = buildRows(payments);
  // receipts and expenses are independent columns, so line i carries the i-th receipt and the i-th expense
  const lineCount = Math.max(MIN_ROWS, receiptRows.length, expenses.length);
  const shown: Row[] = Array.from({ length: lineCount }, (_, i) => {
    const base = receiptRows[i] ?? { key: `blank-${i}`, cash: 0, transfer: 0, transferText: "", card: 0, owedAfter: 0, owedText: "", paidBalance: "", balanceParts: [], expenseText: "", expenseNote: "" };
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
  // Only balances paid in cash count — in the total of the Khách trả cọc column and in the cash handed over;
  // balances paid by transfer or card are written on their line but not added.
  const balanceCash = payments.filter((p) => p.kind === "Thu nốt" && p.method === "CASH").reduce((s, p) => s + p.amount, 0);
  const handover = ds - totalTransfer - totalCard - totalOwed - totalExpenses + balanceCash;

  const [y, m, d] = date.split("-");
  const sellerName = isAdmin ? (sellerId === "all" ? "Tất cả" : (sellers?.find((s) => s.id === sellerId)?.name ?? "")) : username;
  const fixedCash = FIXED_CASH_BY_BRANCH[sellerName] ?? "-";

  // Every face as drawn on screen, each laid onto one A5 landscape page (shrunk to fit, so nothing is cut off
  // when printed). Front first, then one back page per branch.
  async function makeA5Pages(): Promise<string[] | null> {
    const backNodes = Array.from(backAreaRef.current?.querySelectorAll<HTMLElement>("[data-back-page]") ?? []);
    const nodes = [sheetRef.current, ...backNodes];
    if (nodes.some((n) => !n) || saving) return null;
    setSaving(true);
    try {
      return await Promise.all(nodes.map(async (n) => URL.createObjectURL(await renderA5Png(n!))));
    } catch {
      toast({ title: "Không tạo được ảnh tờ thu chi", variant: "destructive" });
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function savePng() {
    const urls = await makeA5Pages();
    if (!urls) return;
    const slug = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9]+/g, "-");
    const names = [
      "mat-truoc",
      ...backPages.map((p) => (backPages.length > 1 && p.branchName ? `mat-sau-${slug(p.branchName)}` : "mat-sau")),
    ];
    urls.forEach((url, i) => {
      const a = document.createElement("a");
      a.href = url;
      a.download = `to-thu-chi-${date}-${names[i]}-A5.png`;
      a.click();
    });
    setTimeout(() => urls.forEach((u) => URL.revokeObjectURL(u)), 10_000);
  }

  async function printSheet() {
    const urls = await makeA5Pages();
    if (urls) printA5Pages(urls, () => urls.forEach((u) => URL.revokeObjectURL(u)));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
        <div className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ngày</p>
          <DatePicker value={date} onChange={setDate} className="w-[150px]" />
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
        <div className="ml-auto flex gap-2">
          <Button variant="outline" className="gap-1.5" disabled={saving} onClick={savePng}>
            <Download className="h-4 w-4" /> {saving ? "Đang tạo ảnh..." : "Tải ảnh A5 (2 mặt)"}
          </Button>
          <Button className="gap-1.5" disabled={saving} onClick={printSheet}>
            <Printer className="h-4 w-4" /> In A5 (2 mặt)
          </Button>
        </div>
      </div>

      <div className="flex gap-2">
        {(
          [
            ["front", "Mặt trước"],
            ["back", "Mặt sau"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setFace(key)}
            className={cn(
              "h-9 rounded-full border px-4 text-sm transition-colors",
              face === key ? "border-primary bg-primary/10 font-medium text-primary" : "border-input text-muted-foreground hover:bg-accent",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* the face that is not showing stays on the page, just out of sight, so "Tải ảnh" / "In" still output both */}
      <div className={cn("overflow-x-auto", face !== "front" && OFF_SCREEN)} aria-hidden={face !== "front"}>
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
                {/* fixed line heights: stacked Vietnamese marks (ệ, ữ...) must not make one cell's line taller
                    than its neighbours', which pushed the value down in the exported picture */}
                <span className="block h-4 whitespace-nowrap text-xs font-semibold leading-4 text-black/70">{label}</span>
                <span className="block h-7 whitespace-nowrap text-xl font-bold leading-7">{value}</span>
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
                    <td className={cn(cell, num, "whitespace-pre-line leading-5")}>{r.transferText}</td>
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
                <td className={cn(cell, num)}>{money(balanceCash)}</td>
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
                <span className="block h-4 whitespace-nowrap text-xs font-semibold leading-4 text-black/70">{label}</span>
                <span className="block h-7 whitespace-nowrap text-lg font-bold leading-7 tabular-nums">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div ref={backAreaRef} className={cn("space-y-4", face !== "back" && OFF_SCREEN)} aria-hidden={face !== "back"}>
        {backPages.map((page) => (
          <div key={page.branchName || "blank"} className="space-y-1.5">
            {/* the title and grey frame are only for looking at it on screen; the picture/print is the plain white page inside */}
            <p className="text-sm font-semibold">{page.branchName ? `Mặt sau - cơ sở ${page.branchName}` : "Mặt sau"}</p>
            <div className="overflow-x-auto">
              <div className="w-fit rounded-md border border-dashed border-muted-foreground/40">
                <CashbookBack lines={page.lines} />
              </div>
            </div>
          </div>
        ))}
      </div>
      {face === "back" ? (
        <p className="text-xs text-muted-foreground">
          Mặt sau để trắng, mỗi cơ sở một trang, chỉ ghi các đơn khách trả cọc còn phải thu thêm của chính cơ sở đó, không
          ghi chung (tên theo hóa đơn, số điện thoại, số tiền còn thiếu, ngày mua). Đơn chưa trả hết sẽ được ghi lại ở các
          tờ ngày sau. Ngày khách nhận kính và trả nốt, tiền vẫn vào mặt trước (cột Khách trả cọc), còn dòng ở mặt sau bị
          gạch ngang và không hiện ở tờ ngày tiếp theo nữa.
        </p>
      ) : (
        <>
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
        </>
      )}
    </div>
  );
}
