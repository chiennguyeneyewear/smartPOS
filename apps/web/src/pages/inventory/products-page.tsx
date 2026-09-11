import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronDown, Pencil, Search, SlidersHorizontal, Trash2, Upload } from "lucide-react";
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
import { useAuthStore } from "@/stores/auth-store";
import {
  useCategories,
  useCreateProduct,
  useDeleteProduct,
  useProducts,
  useUnits,
  useUpdateProduct,
} from "@/features/products/hooks";
import { ProductImportDialog } from "./product-import-dialog";

function formatNumber(value: number): string {
  return value.toLocaleString("en-US");
}

function emptyForm(): ProductInput {
  return {
    sku: "",
    barcode: "",
    name: "",
    categoryId: undefined,
    unitId: "",
    costPrice: 0,
    sellPrice: 0,
    isActive: true,
  };
}

export function ProductsPage() {
  const activeBranchId = useAuthStore((s) => s.activeBranchId);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<ProductSummary | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ ids: string[]; label: string } | null>(null);
  const { data, isLoading } = useProducts({ search, branchId: activeBranchId ?? undefined, page: 1, pageSize: 50 });
  const { data: categories } = useCategories();
  const { data: units } = useUnits();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  const products = data?.data ?? [];
  const totalStockValue = useMemo(
    () => products.reduce((sum, p) => sum + p.costPrice * (p.stockQuantity ?? 0), 0),
    [products],
  );
  const allSelected = products.length > 0 && products.every((p) => selectedIds.has(p.id));
  const isEditing = !!editingProduct;

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

  function toggleExpanded(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProductInput>({ resolver: zodResolver(productSchema), defaultValues: emptyForm() });

  const categoryId = watch("categoryId");
  const unitId = watch("unitId");

  function openCreateDialog() {
    setEditingProduct(null);
    reset(emptyForm());
    setOpen(true);
  }

  function openEditDialog(p: ProductSummary) {
    setEditingProduct(p);
    reset({
      sku: p.sku,
      barcode: p.barcode ?? "",
      name: p.name,
      categoryId: p.categoryId ?? undefined,
      unitId: p.unitId,
      costPrice: p.costPrice,
      sellPrice: p.sellPrice,
      isActive: p.isActive,
    });
    setOpen(true);
  }

  const onSubmit = handleSubmit((values) => {
    if (editingProduct) {
      updateProduct.mutate(
        { id: editingProduct.id, input: values },
        {
          onSuccess: () => {
            setOpen(false);
            setEditingProduct(null);
          },
        },
      );
      return;
    }
    createProduct.mutate(values, {
      onSuccess: () => {
        reset(emptyForm());
        setOpen(false);
      },
    });
  });

  async function confirmDelete() {
    if (!deleteTarget) return;
    await Promise.all(deleteTarget.ids.map((id) => deleteProduct.mutateAsync(id)));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      deleteTarget.ids.forEach((id) => next.delete(id));
      return next;
    });
    if (deleteTarget.ids.includes(expandedId ?? "")) setExpandedId(null);
    setDeleteTarget(null);
  }

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
          {selectedIds.size > 0 && (
            <Button
              variant="outline"
              className="gap-1.5 border-destructive text-destructive hover:bg-destructive/5"
              onClick={() =>
                setDeleteTarget({ ids: Array.from(selectedIds), label: `${selectedIds.size} sản phẩm đã chọn` })
              }
            >
              <Trash2 className="h-4 w-4" />
              Xóa ({selectedIds.size})
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-1.5 border-primary text-primary hover:bg-primary/5">
                Tạo mới
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={openCreateDialog}>Hàng hóa</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="outline"
            className="gap-1.5"
            onClick={() => setImportOpen(true)}
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
              products.map((p: ProductSummary) => {
                const isExpanded = expandedId === p.id;
                const category = categories?.find((c) => c.id === p.categoryId);
                return (
                  <>
                    <tr
                      key={p.id}
                      onClick={() => toggleExpanded(p.id)}
                      className={
                        isExpanded
                          ? "cursor-pointer border-l-[3px] border-l-primary border-t bg-primary/10 hover:bg-primary/10"
                          : "cursor-pointer border-t hover:bg-accent"
                      }
                    >
                      <td className="p-3" onClick={(e) => e.stopPropagation()}>
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
                    {isExpanded && (
                      <tr className="border-l-[3px] border-l-primary bg-primary/5">
                        <td colSpan={6} className="p-4">
                          <div className="flex flex-wrap items-start justify-between gap-4">
                            <div className="grid flex-1 grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-4">
                              <div>
                                <p className="text-xs text-muted-foreground">Mã hàng</p>
                                <p className="font-medium">{p.sku}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Mã vạch</p>
                                <p className="font-medium">{p.barcode || "Chưa có"}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Nhóm hàng</p>
                                <p className="font-medium">{category?.name ?? "Chưa phân loại"}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Đơn vị tính</p>
                                <p className="font-medium">{p.unit.name}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Giá vốn</p>
                                <p className="font-medium">{formatNumber(p.costPrice)}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Giá bán</p>
                                <p className="font-medium">{formatNumber(p.sellPrice)}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Tồn kho</p>
                                <p className="font-medium">
                                  {typeof p.stockQuantity === "number" ? formatNumber(p.stockQuantity) : "—"}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Trạng thái</p>
                                <p className="font-medium">{p.isActive ? "Đang bán" : "Ngừng bán"}</p>
                              </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-1.5"
                                onClick={() => openEditDialog(p)}
                              >
                                <Pencil className="h-3.5 w-3.5" /> Chỉnh sửa
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-1.5 border-destructive text-destructive hover:bg-destructive/5"
                                onClick={() => setDeleteTarget({ ids: [p.id], label: p.name })}
                              >
                                <Trash2 className="h-3.5 w-3.5" /> Xóa
                              </Button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEditing ? `Sửa sản phẩm — ${editingProduct?.name}` : "Thêm sản phẩm"}</DialogTitle>
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
              <Select value={unitId} onValueChange={(v) => setValue("unitId", v)}>
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
              <Select value={categoryId ?? undefined} onValueChange={(v) => setValue("categoryId", v)}>
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
              <Button type="submit" disabled={createProduct.isPending || updateProduct.isPending}>
                {createProduct.isPending || updateProduct.isPending ? "Đang lưu..." : "Lưu sản phẩm"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xóa sản phẩm</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Bạn có chắc chắn muốn xóa <span className="font-medium text-foreground">{deleteTarget?.label}</span>?
            Hành động này không thể hoàn tác.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Hủy
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleteProduct.isPending}>
              {deleteProduct.isPending ? "Đang xóa..." : "Xóa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ProductImportDialog open={importOpen} onOpenChange={setImportOpen} />
    </div>
  );
}
