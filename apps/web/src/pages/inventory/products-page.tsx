import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronDown, Search, SlidersHorizontal, Upload } from "lucide-react";
import { productSchema, type ProductInput, type ProductSummary } from "@smartpos/shared";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/stores/toast-store";
import { useAuthStore } from "@/stores/auth-store";
import { useCategories, useCreateProduct, useProducts, useUnits } from "@/features/products/hooks";

function formatNumber(value: number): string {
  return value.toLocaleString("en-US");
}

export function ProductsPage() {
  const activeBranchId = useAuthStore((s) => s.activeBranchId);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const { data, isLoading } = useProducts({ search, branchId: activeBranchId ?? undefined, page: 1, pageSize: 50 });
  const { data: categories } = useCategories();
  const { data: units } = useUnits();
  const createProduct = useCreateProduct();

  const products = data?.data ?? [];
  const totalStockValue = useMemo(
    () => products.reduce((sum, p) => sum + p.costPrice * (p.stockQuantity ?? 0), 0),
    [products],
  );
  const allSelected = products.length > 0 && products.every((p) => selectedIds.has(p.id));

  function toggleAll() {
    setSelectedIds(allSelected ? new Set() : new Set(products.map((p) => p.id)));
  }

  function toggleOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<ProductInput>({ resolver: zodResolver(productSchema) });

  const onSubmit = handleSubmit((values) => {
    createProduct.mutate(values, {
      onSuccess: () => {
        reset();
        setOpen(false);
      },
    });
  });

  return (
    <div>
      <PageHeader title="Hàng hóa" description="Quản lý danh mục sản phẩm" />

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Theo mã, tên hàng"
            className="pl-8 pr-9"
          />
          <SlidersHorizontal className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-1.5 border-primary text-primary hover:bg-primary/5">
                Tạo mới
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setOpen(true)}>Hàng hóa</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="outline"
            className="gap-1.5"
            onClick={() => toast({ title: "Tính năng nhập hàng từ Excel đang được phát triển" })}
          >
            <Upload className="h-4 w-4" />
            Import
          </Button>
        </div>
      </div>

      <div className="overflow-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="w-10 p-3">
                <input type="checkbox" checked={allSelected} onChange={toggleAll} />
              </th>
              <th className="whitespace-nowrap p-3 text-left text-sm font-semibold text-muted-foreground">
                Mã hàng
              </th>
              <th className="whitespace-nowrap p-3 text-left text-sm font-semibold text-muted-foreground">
                Tên hàng
              </th>
              <th className="whitespace-nowrap p-3 text-right text-sm font-semibold text-muted-foreground">
                Giá bán
              </th>
              <th className="whitespace-nowrap p-3 text-right text-sm font-semibold text-muted-foreground">
                Giá vốn
              </th>
              <th className="whitespace-nowrap p-3 text-right text-sm font-semibold text-muted-foreground">
                Tồn kho
              </th>
            </tr>
          </thead>
          <tbody>
            {!isLoading && products.length > 0 && (
              <tr className="border-t bg-muted/20">
                <td colSpan={4} />
                <td colSpan={2} className="whitespace-nowrap p-3 text-right font-semibold">
                  {formatNumber(totalStockValue)}
                </td>
              </tr>
            )}
            {isLoading && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-sm text-muted-foreground">
                  Đang tải dữ liệu...
                </td>
              </tr>
            )}
            {!isLoading && products.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-sm text-muted-foreground">
                  Chưa có sản phẩm
                </td>
              </tr>
            )}
            {!isLoading &&
              products.map((p: ProductSummary) => (
                <tr key={p.id} className="border-t hover:bg-accent/40">
                  <td className="p-3">
                    <input type="checkbox" checked={selectedIds.has(p.id)} onChange={() => toggleOne(p.id)} />
                  </td>
                  <td className="whitespace-nowrap p-3">{p.sku}</td>
                  <td className="min-w-[220px] p-3 font-medium">{p.name}</td>
                  <td className="whitespace-nowrap p-3 text-right">{formatNumber(p.sellPrice)}</td>
                  <td className="whitespace-nowrap p-3 text-right">{formatNumber(p.costPrice)}</td>
                  <td className="whitespace-nowrap p-3 text-right">
                    {typeof p.stockQuantity === "number" ? formatNumber(p.stockQuantity) : "—"}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thêm sản phẩm</DialogTitle>
          </DialogHeader>
          <form className="grid grid-cols-2 gap-4" onSubmit={onSubmit}>
            <div className="space-y-1.5">
              <Label>Mã hàng (SKU)</Label>
              <Input {...register("sku")} />
              {errors.sku && <p className="text-xs text-destructive">{errors.sku.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Mã vạch</Label>
              <Input {...register("barcode")} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Tên sản phẩm</Label>
              <Input {...register("name")} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Đơn vị tính</Label>
              <Select onValueChange={(v) => setValue("unitId", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn đơn vị" />
                </SelectTrigger>
                <SelectContent>
                  {units?.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Danh mục</Label>
              <Select onValueChange={(v) => setValue("categoryId", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn danh mục" />
                </SelectTrigger>
                <SelectContent>
                  {categories?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Giá vốn</Label>
              <Input type="number" {...register("costPrice")} />
            </div>
            <div className="space-y-1.5">
              <Label>Giá bán</Label>
              <Input type="number" {...register("sellPrice")} />
            </div>
            <DialogFooter className="col-span-2">
              <Button type="submit" disabled={createProduct.isPending}>
                {createProduct.isPending ? "Đang lưu..." : "Lưu sản phẩm"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
