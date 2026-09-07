import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus, Search } from "lucide-react";
import { productSchema, type ProductInput, type ProductSummary } from "@smartpos/shared";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
import { useCategories, useCreateProduct, useProducts, useUnits } from "@/features/products/hooks";

const columns: ColumnDef<ProductSummary, any>[] = [
  { accessorKey: "sku", header: "Mã hàng" },
  {
    accessorKey: "name",
    header: "Tên sản phẩm",
    cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
  },
  { accessorFn: (row) => row.unit?.name, header: "ĐVT" },
  { accessorKey: "costPrice", header: "Giá vốn", cell: ({ getValue }) => formatCurrency(getValue() as number) },
  { accessorKey: "sellPrice", header: "Giá bán", cell: ({ getValue }) => formatCurrency(getValue() as number) },
];

export function ProductsPage() {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useProducts({ search, page: 1, pageSize: 50 });
  const { data: categories } = useCategories();
  const { data: units } = useUnits();
  const createProduct = useCreateProduct();

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
      <PageHeader
        title="Hàng hóa"
        description="Quản lý danh mục sản phẩm"
        actions={
          <Button onClick={() => setOpen(true)} className="gap-1.5">
            <Plus className="h-4 w-4" /> Thêm sản phẩm
          </Button>
        }
      />

      <div className="relative mb-3 max-w-sm">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm theo tên, mã hàng, mã vạch..."
          className="pl-8"
        />
      </div>

      <DataTable columns={columns} data={data?.data ?? []} isLoading={isLoading} emptyMessage="Chưa có sản phẩm" />

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
