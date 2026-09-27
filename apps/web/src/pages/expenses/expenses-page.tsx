import { useEffect, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { expenseSchema } from "@smartpos/shared";
import { PageHeader } from "@/components/shared/page-header";
import { DatePicker } from "@/components/shared/date-picker";
import { MoneyInput, formatMoney, parseMoney } from "@/components/shared/money-input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn, formatCurrency } from "@/lib/utils";
import { useUsers } from "@/features/users/hooks";
import { CashbookTab } from "@/pages/orders/cashbook-tab";
import { useAuthStore } from "@/stores/auth-store";
import { useBranches } from "@/features/branches/hooks";
import {
  useCreateExpense,
  useDeleteExpense,
  useExpenses,
  usePayers,
  useUpdateExpense,
} from "@/features/expenses/hooks";
import type { ExpenseSummary } from "@/features/expenses/api";

const todayVn = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
const vnDay = (iso: string) => new Date(new Date(iso).getTime() + 7 * 3600_000).toISOString().slice(0, 10);

export function ExpensesPage() {
  const user = useAuthStore((s) => s.user);
  const activeBranchId = useAuthStore((s) => s.activeBranchId);
  const isAdmin = user?.role === "admin";
  const { data: branches } = useBranches();

  const [tab, setTab] = useState<"expenses" | "sheet">("expenses");
  const { data: users } = useUsers({ enabled: isAdmin });
  const [date, setDate] = useState(todayVn());
  const { data: list, isLoading } = useExpenses({ date });
  const { data: payers } = usePayers();
  const create = useCreateExpense();
  const update = useUpdateExpense();
  const remove = useDeleteExpense();

  const [editing, setEditing] = useState<ExpenseSummary | null>(null);
  const [deleting, setDeleting] = useState<ExpenseSummary | null>(null);
  const [amount, setAmount] = useState("");
  const [payer, setPayer] = useState("");
  const [content, setContent] = useState("");
  const [branchId, setBranchId] = useState("");
  const [error, setError] = useState<string | null>(null);

  // the branch a new expense goes to defaults to the one being worked in
  useEffect(() => {
    if (!branchId && branches?.length) {
      setBranchId(branches.find((b) => b.id === activeBranchId)?.id ?? branches[0]!.id);
    }
  }, [branches, activeBranchId, branchId]);

  function reset() {
    setEditing(null);
    setAmount("");
    setPayer("");
    setContent("");
    setError(null);
  }

  function edit(e: ExpenseSummary) {
    setEditing(e);
    setAmount(formatMoney(e.amount));
    setPayer(e.payer);
    setContent(e.content);
    setBranchId(e.branchId);
    setDate(e.date);
    setError(null);
  }

  function submit() {
    const parsed = expenseSchema.safeParse({ date, branchId, amount: parseMoney(amount), payer, content });
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Dữ liệu chưa hợp lệ");
    setError(null);
    if (editing) update.mutate({ id: editing.id, input: parsed.data }, { onSuccess: reset });
    else create.mutate(parsed.data, { onSuccess: () => (setAmount(""), setContent("")) });
  }

  const rows = list ?? [];
  const total = rows.reduce((sum, r) => sum + r.amount, 0);
  const canChange = (e: ExpenseSummary) => isAdmin || (e.createdById === user?.id && vnDay(e.createdAt) === todayVn());
  const busy = create.isPending || update.isPending;

  return (
    <div className="space-y-4">
      <PageHeader title="Chi tiêu" description="Ghi tiền chi ra trong ngày. Khoản chi tự lên tờ thu chi của ngày đó" />

      <div className="flex gap-2">
        {(
          [
            ["expenses", "Ghi chi tiêu"],
            ["sheet", "Tờ thu chi"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn(
              "h-9 rounded-full border px-4 text-sm transition-colors",
              tab === key ? "border-primary bg-primary/10 font-medium text-primary" : "border-input text-muted-foreground hover:bg-accent",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "sheet" && (
        <CashbookTab
          isAdmin={isAdmin}
          sellers={users?.map((u) => ({ id: u.id, name: u.username, branchIds: u.branches.map((b) => b.id) }))}
        />
      )}

      <div className={cn("space-y-4", tab === "sheet" && "hidden")}>
      <Card>
        <CardContent className="space-y-4 pt-4">
          <p className="text-sm font-semibold">{editing ? `Sửa khoản chi ${editing.payer}` : "Ghi khoản chi mới"}</p>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-[180px_1fr_1.4fr_150px_130px]">
            <div className="space-y-1.5">
              <Label>Số tiền</Label>
              <MoneyInput value={amount} onChange={setAmount} placeholder="0" />
            </div>
            <div className="space-y-1.5">
              <Label>Người chi</Label>
              <Input value={payer} onChange={(e) => setPayer(e.target.value)} list="expense-payers" placeholder="Ví dụ: Chiến" />
              <datalist id="expense-payers">
                {payers?.map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>
            </div>
            <div className="space-y-1.5">
              <Label>Nội dung chi</Label>
              <Input value={content} onChange={(e) => setContent(e.target.value)} placeholder="Ví dụ: Mua gạo" />
            </div>
            <div className="space-y-1.5">
              <Label>Cơ sở</Label>
              <Select value={branchId} onValueChange={setBranchId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {branches?.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Ngày chi</Label>
              <DatePicker value={date} onChange={setDate} className="w-full" />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button onClick={submit} disabled={busy}>
              {busy ? "Đang lưu..." : editing ? "Lưu thay đổi" : "Ghi khoản chi"}
            </Button>
            {editing && (
              <Button variant="outline" onClick={reset}>
                Bỏ qua
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <p className="font-medium">Khoản chi ngày {date.split("-").reverse().join("/")}</p>
        <p className="text-muted-foreground">
          {rows.length} khoản · Tổng chi <span className="font-semibold text-foreground">{formatCurrency(total)}</span>
        </p>
      </div>

      <div className="overflow-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left font-semibold text-muted-foreground">
            <tr>
              <th className="p-3">Người chi</th>
              <th className="p-3">Nội dung chi</th>
              <th className="p-3 text-right">Số tiền</th>
              <th className="p-3">Cơ sở</th>
              <th className="p-3">Người nhập</th>
              <th className="w-24 p-3" />
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
            {!isLoading && rows.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-muted-foreground">
                  Chưa có khoản chi nào trong ngày này
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-3 font-medium">{r.payer}</td>
                <td className="p-3">{r.content}</td>
                <td className="whitespace-nowrap p-3 text-right font-medium tabular-nums">{r.amount.toLocaleString("en-US")}</td>
                <td className="p-3">{r.branchName}</td>
                <td className="p-3 text-muted-foreground">{r.createdByName}</td>
                <td className="p-3">
                  {canChange(r) && (
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => edit(r)}
                        className="rounded p-1.5 text-muted-foreground hover:bg-accent"
                        aria-label="Sửa"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleting(r)}
                        className="rounded p-1.5 text-destructive hover:bg-destructive/10"
                        aria-label="Xóa"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Xóa khoản chi</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Xóa khoản chi <span className="font-medium text-foreground">{deleting?.content}</span> (
            {formatCurrency(deleting?.amount ?? 0)})? Khoản này sẽ biến mất khỏi tờ thu chi.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>
              Bỏ qua
            </Button>
            <Button
              variant="destructive"
              disabled={remove.isPending}
              onClick={() => deleting && remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) })}
            >
              Xóa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}
