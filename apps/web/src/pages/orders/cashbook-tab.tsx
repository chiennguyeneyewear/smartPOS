import { useState } from "react";
import { DatePicker } from "@/components/shared/date-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import { usePaymentsOnDay } from "@/features/sales/hooks";
import type { DayPayment } from "@/features/sales/api";
import { CashSheets } from "./cash-sheets";

const FLOAT_CASH = 3_000_000; // "Tiền mặt cố định 3 triệu" printed on the paper sheet
const MIN_ROWS = 16;
const SHORT: Record<string, string> = { CASH: "TM", BANK_TRANSFER: "CK", CARD: "QT", DEBT: "Nợ" };

const todayVn = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
const vn = (iso: string) => new Date(new Date(iso).getTime() + 7 * 3600_000);
const dm = (iso: string) => `${vn(iso).getUTCDate()}/${vn(iso).getUTCMonth() + 1}`;
const money = (n: number) => (n ? n.toLocaleString("en-US") : "");

interface Row {
  key: string;
  cash: number;
  transfer: number;
  card: number;
  afterDeposit: string;
  amount: number;
  note: string;
}

// One line per payment received that day, laid out like the paper sheet:
//  - a sale or a deposit goes under the method it was paid with (Tiền mặt / Chuyển khoản / Quẹt thẻ);
//    a deposit also says in "Sau cọc còn" that a balance is left, with that balance in "Số tiền";
//  - the balance collected later is written as "Trả cọc còn" with its amount in "Số tiền", and the note reads
//    like the hand-written one: customer, amount, method, and the day the deposit was taken.
function toRow(p: DayPayment): Row {
  if (p.kind === "Thu nốt") {
    return {
      key: p.id,
      cash: 0,
      transfer: 0,
      card: 0,
      afterDeposit: "Trả cọc còn",
      amount: p.amount,
      note: `${p.customerName} ${p.amount.toLocaleString("en-US")} ${SHORT[p.method] ?? ""} ${dm(p.firstPaidAt)}`,
    };
  }
  const deposit = p.kind === "Cọc";
  return {
    key: p.id,
    cash: p.method === "CASH" ? p.amount : 0,
    transfer: p.method === "BANK_TRANSFER" ? p.amount : 0,
    card: p.method === "CARD" ? p.amount : 0,
    afterDeposit: deposit ? "Sau cọc còn" : "",
    amount: deposit ? p.remainingAfter : 0,
    note: `${p.customerName} · ${p.invoiceCode}${deposit ? " (cọc)" : ""}`,
  };
}

const cell = "border-r border-foreground/80 px-2 py-1.5 last:border-r-0";

// The day's thu-chi sheet, drawn with the same columns as the paper one and filled from what the system
// recorded. The scan or photo of the real paper sheet can still be attached underneath.
export function CashbookTab({ isAdmin, sellers }: { isAdmin: boolean; sellers?: { id: string; name: string }[] }) {
  const username = useAuthStore((s) => s.user?.username) ?? "";
  const [date, setDate] = useState(todayVn());
  const [sellerId, setSellerId] = useState("all");
  const { data, isLoading } = usePaymentsOnDay({ date, sellerId: isAdmin && sellerId !== "all" ? sellerId : undefined });

  const rows = (data?.payments ?? []).map(toRow);
  const shown: Row[] = [
    ...rows,
    ...Array.from({ length: Math.max(0, MIN_ROWS - rows.length) }, (_, i) => ({
      key: `blank-${i}`,
      cash: 0,
      transfer: 0,
      card: 0,
      afterDeposit: "",
      amount: 0,
      note: "",
    })),
  ];
  const totalCash = rows.reduce((s, r) => s + r.cash, 0);
  const totalTransfer = rows.reduce((s, r) => s + r.transfer, 0);
  const totalCard = rows.reduce((s, r) => s + r.card, 0);
  const totalBalance = rows.filter((r) => r.afterDeposit === "Trả cọc còn").reduce((s, r) => s + r.amount, 0);
  // everything received that day, whichever column it was written in
  const ds = totalCash + totalTransfer + totalCard + totalBalance;
  const handover = FLOAT_CASH + totalCash + (data?.payments ?? []).filter((p) => p.kind === "Thu nốt" && p.method === "CASH").reduce((s, p) => s + p.amount, 0);
  const [y, m, d] = date.split("-");
  const sellerName = isAdmin ? (sellerId === "all" ? "Tất cả" : (sellers?.find((s) => s.id === sellerId)?.name ?? "")) : username;

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
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[860px] rounded-md border-2 border-foreground/80 bg-background text-sm">
          <div className="grid grid-cols-[1.4fr_1fr_1fr_1fr] items-baseline gap-2 border-b border-foreground/80 px-3 py-2 font-semibold">
            <span>Tiền mặt cố định 3 triệu</span>
            <span>
              Doanh số cơ sở: <span className="font-normal">{sellerName}</span>
            </span>
            <span>
              Ngày <span className="font-normal">{d}</span>
            </span>
            <span>
              Tháng <span className="font-normal">{m}</span>
              <span className="ml-3 font-normal text-muted-foreground">{y}</span>
            </span>
          </div>

          <table className="w-full table-fixed border-collapse">
            <colgroup>
              <col className="w-[13%]" />
              <col className="w-[13%]" />
              <col className="w-[11%]" />
              <col className="w-[15%]" />
              <col className="w-[11%]" />
              <col className="w-[37%]" />
            </colgroup>
            <thead>
              <tr className="border-b-2 border-foreground/80 text-center font-semibold">
                <th className={cell}>Tiền mặt</th>
                <th className={cell}>Chuyển khoản</th>
                <th className={cell}>Quẹt thẻ</th>
                <th className={cn(cell, "border-l-2")}>Sau cọc còn</th>
                <th className={cell}>Số tiền</th>
                <th className={cell}>Ghi chú</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-muted-foreground">
                    Đang tải dữ liệu...
                  </td>
                </tr>
              )}
              {!isLoading &&
                shown.map((r) => (
                  <tr key={r.key} className="h-9 border-b border-dashed border-foreground/60">
                    <td className={cn(cell, "text-right tabular-nums")}>{money(r.cash)}</td>
                    <td className={cn(cell, "text-right tabular-nums")}>{money(r.transfer)}</td>
                    <td className={cn(cell, "text-right tabular-nums")}>{money(r.card)}</td>
                    <td className={cn(cell, "border-l-2 text-center text-xs")}>{r.afterDeposit}</td>
                    <td className={cn(cell, "text-right tabular-nums")}>{money(r.amount)}</td>
                    <td className={cn(cell, "text-xs")}>{r.note}</td>
                  </tr>
                ))}
              <tr className="border-t-2 border-foreground/80 font-semibold">
                <td className={cn(cell, "text-right tabular-nums")}>{money(totalCash)}</td>
                <td className={cn(cell, "text-right tabular-nums")}>{money(totalTransfer)}</td>
                <td className={cn(cell, "text-right tabular-nums")}>{money(totalCard)}</td>
                <td className={cn(cell, "border-l-2 text-center")}>Tổng</td>
                <td className={cn(cell, "text-right tabular-nums")}>{money(totalBalance)}</td>
                <td className={cell} />
              </tr>
            </tbody>
          </table>

          <div className="space-y-2 border-t-2 border-foreground/80 px-3 py-3 font-semibold">
            <p>
              DS: <span className="font-normal tabular-nums">{money(ds)}</span>
              <span className="mx-2">-</span>
              <span className="inline-block min-w-[140px] border-b border-dotted border-foreground/60 align-bottom" />
            </p>
            <p className="flex flex-wrap items-baseline gap-x-2">
              Tổng tiền bàn giao <span className="font-normal tabular-nums">{money(handover)}</span>
              <span className="mx-2">+ - Tiền</span>
              <span className="inline-block min-w-[120px] border-b border-dotted border-foreground/60" />
              <span className="ml-4">Người tổng kết</span>
              <span className="font-normal">{isAdmin ? "" : username}</span>
              <span className="inline-block min-w-[120px] border-b border-dotted border-foreground/60" />
            </p>
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
        Tiền bàn giao = tiền mặt cố định 3 triệu + tiền mặt thu trong ngày (gồm cả tiền mặt trả cọc còn). DS = tổng tiền
        thu trong ngày.
      </p>

      <div className="space-y-2 border-t pt-4">
        <p className="text-sm font-semibold">Ảnh / file tờ giấy của ngày này</p>
        <CashSheets date={date} />
      </div>
    </div>
  );
}
