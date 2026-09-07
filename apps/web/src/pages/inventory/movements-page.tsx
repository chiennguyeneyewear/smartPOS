import { useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus, Trash2 } from "lucide-react";
import { STOCK_MOVEMENT_TYPES, type StockMovementSummary, type StockMovementType } from "@smartpos/shared";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import { useBranches } from "@/features/branches/hooks";
import { useCreateStockMovement, useMovements } from "@/features/inventory/hooks";
import { useProducts } from "@/features/products/hooks";

const TYPE_LABELS: Record<StockMovementType, string> = {
  IMPORT: "Nhập kho",
  EXPORT: "Xuất kho",
  TRANSFER: "Chuyển kho",
  STOCK_TAKE: "Kiểm kho",
  SALE: "Bán hàng",
  SALE_RETURN: "Trả hàng",
};

const columns: ColumnDef<StockMovementSummary, any>[] = [
  { accessorKey: "type", header: "Loại phiếu", cell: ({ getValue }) => <Badge variant="secondary">{TYPE_LABELS[getValue() as StockMovementType]}</Badge> },
  { accessorKey: "note", header: "Ghi chú" },
  { accessorKey: "createdAt", header: "Thời gian", cell: ({ getValue }) => formatDateTime(getValue() as string) },
];

interface DraftLine {
  productId: string;
  name: string;
  quantity: number;
  unitCost: number;
}

export function MovementsPage() {
  const activeBranchId = useAuthStore((s) => s.activeBranchId);
  const { data: branches } = useBranches();
  const { data: movements, isLoading } = useMovements({ branchId: activeBranchId ?? undefined });
  const createMovement = useCreateStockMovement();

  const [open, setOpen] = useState(false);
  const [type, setType] = useState<StockMovementType>(STOCK_MOVEMENT_TYPES.IMPORT);
  const [toBranchId, setToBranchId] = useState<string>("");
  const [note, setNote] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([]);
  const { data: productResults } = useProducts({ search: productSearch, page: 1, pageSize: 10 });

  function addLine(productId: string, name: string) {
    if (lines.some((l) => l.productId === productId)) return;
    setLines((prev) => [...prev, { productId, name, quantity: 1, unitCost: 0 }]);
    setProductSearch("");
  }

  function updateLine(productId: string, patch: Partial<DraftLine>) {
    setLines((prev) => prev.map((l) => (l.productId === productId ? { ...l, ...patch } : l)));
  }

  function removeLine(productId: string) {
    setLines((prev) => prev.filter((l) => l.productId !== productId));
  }

  function handleSubmit() {
    if (!activeBranchId || lines.length === 0) return;
    createMovement.mutate(
      {
        type,
        branchId: type === "TRANSFER" ? toBranchId : activeBranchId,
        fromBranchId: type === "TRANSFER" ? activeBranchId : undefined,
        toBranchId: type === "TRANSFER" ? toBranchId : undefined,
        note,
        lines: lines.map((l) => ({ productId: l.productId, quantity: l.quantity, unitCost: l.unitCost })),
      },
      {
        onSuccess: () => {
          setOpen(false);
          setLines([]);
          setNote("");
        },
      },
    );
  }

  return (
    <div>
      <PageHeader
        title="Phiếu kho"
        description="Nhập / xuất / chuyển / kiểm kho"
        actions={
          <Button onClick={() => setOpen(true)} className="gap-1.5">
            <Plus className="h-4 w-4" /> Tạo phiếu kho
          </Button>
        }
      />
      <DataTable columns={columns} data={movements ?? []} isLoading={isLoading} emptyMessage="Chưa có phiếu kho" />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Tạo phiếu kho</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Loại phiếu</Label>
              <Select value={type} onValueChange={(v) => setType(v as StockMovementType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IMPORT">Nhập kho</SelectItem>
                  <SelectItem value="EXPORT">Xuất kho</SelectItem>
                  <SelectItem value="TRANSFER">Chuyển kho</SelectItem>
                  <SelectItem value="STOCK_TAKE">Kiểm kho</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {type === "TRANSFER" && (
              <div className="space-y-1.5">
                <Label>Chuyển đến chi nhánh</Label>
                <Select value={toBranchId} onValueChange={setToBranchId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn chi nhánh" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches?.filter((b) => b.id !== activeBranchId).map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Ghi chú</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} />
          </div>

          <div className="relative space-y-1.5">
            <Label>Thêm sản phẩm</Label>
            <Input
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              placeholder="Tìm sản phẩm để thêm..."
            />
            {productSearch && (
              <div className="absolute z-20 max-h-48 w-full overflow-auto rounded-md border bg-popover shadow-md">
                {productResults?.data.map((p) => (
                  <button
                    key={p.id}
                    onMouseDown={() => addLine(p.id, p.name)}
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-accent"
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {lines.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground">
                  <th className="p-1 text-left">Sản phẩm</th>
                  <th className="p-1 text-right">SL</th>
                  <th className="p-1 text-right">Đơn giá</th>
                  <th className="p-1"></th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => (
                  <tr key={line.productId} className="border-t">
                    <td className="p-1">{line.name}</td>
                    <td className="p-1">
                      <Input
                        type="number"
                        className="h-7 w-16 text-right"
                        value={line.quantity}
                        onChange={(e) => updateLine(line.productId, { quantity: Number(e.target.value) })}
                      />
                    </td>
                    <td className="p-1">
                      <Input
                        type="number"
                        className="h-7 w-24 text-right"
                        value={line.unitCost}
                        onChange={(e) => updateLine(line.productId, { unitCost: Number(e.target.value) })}
                      />
                    </td>
                    <td className="p-1 text-right">
                      <button onClick={() => removeLine(line.productId)} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <DialogFooter>
            <Button onClick={handleSubmit} disabled={lines.length === 0 || createMovement.isPending}>
              {createMovement.isPending ? "Đang lưu..." : "Lưu phiếu kho"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
