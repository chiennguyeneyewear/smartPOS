import { useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Search } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import { useStock } from "@/features/inventory/hooks";
import type { StockRow } from "@/features/inventory/api";

const columns: ColumnDef<StockRow, any>[] = [
  { accessorFn: (row) => row.product.sku, header: "Mã hàng" },
  { accessorFn: (row) => row.product.name, header: "Tên sản phẩm" },
  { accessorFn: (row) => row.product.unit.name, header: "ĐVT" },
  {
    accessorKey: "quantity",
    header: "Tồn kho",
    cell: ({ row }) => {
      const { quantity, product } = row.original;
      const isLow = product.reorderThreshold !== null && quantity < product.reorderThreshold;
      return (
        <Badge variant={isLow ? "destructive" : "secondary"}>{quantity}</Badge>
      );
    },
  },
  {
    id: "value",
    header: "Giá trị tồn",
    cell: ({ row }) => formatCurrency(row.original.quantity * row.original.product.costPrice),
  },
];

export function StockPage() {
  const [search, setSearch] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const activeBranchId = useAuthStore((s) => s.activeBranchId);
  const { data, isLoading } = useStock({ branchId: activeBranchId ?? "", search, lowStock: lowStockOnly });

  return (
    <div>
      <PageHeader title="Tồn kho" description="Số lượng tồn kho theo chi nhánh hiện tại" />
      <div className="mb-3 flex items-center gap-2">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm sản phẩm..." className="pl-8" />
        </div>
        <Button
          variant={lowStockOnly ? "default" : "outline"}
          size="sm"
          className={cn(lowStockOnly && "bg-destructive hover:bg-destructive/90")}
          onClick={() => setLowStockOnly((v) => !v)}
        >
          Sắp hết hàng
        </Button>
      </div>
      <DataTable columns={columns} data={data ?? []} isLoading={isLoading} emptyMessage="Không có dữ liệu tồn kho" />
    </div>
  );
}
