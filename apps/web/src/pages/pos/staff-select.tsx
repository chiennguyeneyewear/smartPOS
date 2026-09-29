import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { salesStaffSchema, type SalesStaffSummary } from "@smartpos/shared";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/stores/auth-store";
import { useCreateSalesStaff, useDeleteSalesStaff, useSalesStaff } from "@/features/sales-staff/hooks";

// Special option value that opens the manage dialog instead of actually selecting anything.
const MANAGE = "__manage__";

// One "Người bán hàng" / "Người đo mắt" dropdown for the invoice, sourced from the shared sales-staff name
// list. Only the admin sees "Quản lý danh sách..." (add/remove a name) — CS1/CS2/CS3 accounts may only pick
// from the list, never add or delete a name (enforced again server-side: POST/DELETE /sales-staff is admin-only).
export function StaffSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | null;
  onChange: (staffId: string | null) => void;
}) {
  const isAdmin = useAuthStore((s) => s.user?.role === "admin");
  const { data: staff } = useSalesStaff();
  const [manageOpen, setManageOpen] = useState(false);

  return (
    <div className="min-w-0 flex-1 space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <select
        value={value ?? ""}
        onChange={(e) => {
          if (e.target.value === MANAGE) {
            setManageOpen(true);
            return;
          }
          onChange(e.target.value || null);
        }}
        className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
      >
        <option value="">Chưa chọn</option>
        {staff?.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
        {isAdmin && <option value={MANAGE}>+ Quản lý danh sách...</option>}
      </select>
      {isAdmin && <SalesStaffManagerDialog open={manageOpen} onOpenChange={setManageOpen} />}
    </div>
  );
}

// Compact per-line "Người bán hàng" override — no label, no "Quản lý danh sách..." (that only lives on
// the main StaffSelect above), so it fits inline next to a cart row without repeating the full block.
export function InlineStaffSelect({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (staffId: string | null) => void;
}) {
  const { data: staff } = useSalesStaff();

  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value || null)}
      className="h-6 shrink-0 rounded border border-input bg-background px-1.5 text-xs"
    >
      <option value="">Chưa chọn</option>
      {staff?.map((s) => (
        <option key={s.id} value={s.id}>
          {s.name}
        </option>
      ))}
    </select>
  );
}

function SalesStaffManagerDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { data: staff } = useSalesStaff();
  const createStaff = useCreateSalesStaff();
  const deleteStaff = useDeleteSalesStaff();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<SalesStaffSummary | null>(null);

  useEffect(() => {
    if (open) {
      setName("");
      setError(null);
    }
  }, [open]);

  function add() {
    const parsed = salesStaffSchema.safeParse({ name });
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Tên không hợp lệ");
    setError(null);
    createStaff.mutate(parsed.data, { onSuccess: () => setName("") });
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Danh sách nhân viên bán hàng</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Thêm nhân viên</Label>
              <div className="flex gap-2">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && add()}
                  placeholder="Tên nhân viên"
                  autoFocus
                />
                <Button onClick={add} disabled={createStaff.isPending} className="shrink-0 gap-1.5">
                  <Plus className="h-4 w-4" /> Thêm
                </Button>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
            <div className="max-h-64 divide-y overflow-y-auto rounded-md border">
              {staff?.length ? (
                staff.map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                    <span>{s.name}</span>
                    <button
                      onClick={() => setToDelete(s)}
                      className="rounded p-1.5 text-destructive hover:bg-destructive/10"
                      aria-label="Xóa"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))
              ) : (
                <p className="p-4 text-center text-sm text-muted-foreground">Chưa có nhân viên nào</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Xóa nhân viên</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Xóa <span className="font-medium text-foreground">{toDelete?.name}</span> khỏi danh sách? Các hóa đơn đã
            gắn với người này vẫn được giữ lại.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setToDelete(null)}>
              Bỏ qua
            </Button>
            <Button
              variant="destructive"
              disabled={deleteStaff.isPending}
              onClick={() => toDelete && deleteStaff.mutate(toDelete.id, { onSuccess: () => setToDelete(null) })}
            >
              Xóa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
