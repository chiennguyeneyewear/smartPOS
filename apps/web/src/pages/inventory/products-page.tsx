import { Fragment, useEffect, useState } from "react";
import { ChartNoAxesCombined, ChevronDown, ChevronLeft, ChevronRight, Pencil, Trash2, Upload } from "lucide-react";
import type { ProductSummary } from "@smartpos/shared";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuthStore } from "@/stores/auth-store";
import { useCategories, useDeleteProduct, useProducts } from "@/features/products/hooks";
import { ProductFormDialog, ProductPhoto } from "./product-form-dialog";
import { ProductImportDialog } from "./product-import-dialog";
import { CategoryFilter } from "./category-filter";
import { ProductSearchBox } from "./product-search-box";
import { ProductAnalysisDialog } from "./product-analysis-dialog";

function formatNumber(value: number): string {
  return value.toLocaleString("en-US");
}

export function ProductsPage() {
  const activeBranchId = useAuthStore((s) => s.activeBranchId);
  const [search, setSearch] = useState("");
  const [note, setNote] = useState("");
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const pageSize = 50;
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [analysisProduct, setAnalysisProduct] = useState<ProductSummary | null>(null);
  const [editingProduct, setEditingProduct] = useState<ProductSummary | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ ids: string[]; label: string } | null>(null);
  const { data, isLoading } = useProducts({
    search,
    note: note || undefined,
    categoryId: categoryIds.length > 0 ? categoryIds.join(",") : undefined,
    branchId: activeBranchId ?? undefined,
    page,
    pageSize,
  });
  const { data: categories } = useCategories();
  const deleteProduct = useDeleteProduct();

  useEffect(() => {
    setPage(1);
  }, [search, note, categoryIds]);

  const products = data?.data ?? [];
  const total = data?.meta?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const totalStockValue = data?.meta?.totalStockValue ?? 0;
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

  function openCreateDialog() {
    setEditingProduct(null);
    setOpen(true);
  }

  function openEditDialog(p: ProductSummary) {
    setEditingProduct(p);
    setOpen(true);
  }

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
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        <ProductSearchBox
          search={search}
          note={note}
          onSearchChange={setSearch}
          onApply={(s, n) => {
            setSearch(s);
            setNote(n);
          }}
        />
        <CategoryFilter categories={categories ?? []} value={categoryIds} onApply={setCategoryIds} />
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
              <th className="whitespace-nowrap p-3 text-left text-sm font-semibold text-muted-foreground">
                Nhóm hàng
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
                <td colSpan={5} />
                <td colSpan={2} className="whitespace-nowrap p-3 text-right font-semibold">
                  {formatNumber(totalStockValue)}
                </td>
              </tr>
            )}
            {isLoading && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-sm text-muted-foreground">
                  Đang tải dữ liệu...
                </td>
              </tr>
            )}
            {!isLoading && products.length === 0 && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-sm text-muted-foreground">
                  Chưa có sản phẩm
                </td>
              </tr>
            )}
            {!isLoading &&
              products.map((p: ProductSummary) => {
                const isExpanded = expandedId === p.id;
                const category = categories?.find((c) => c.id === p.categoryId);
                return (
                  <Fragment key={p.id}>
                    <tr
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
                      <td className="whitespace-nowrap p-3">{category?.name ?? "Chưa phân loại"}</td>
                      <td className="whitespace-nowrap p-3 text-right">{formatNumber(p.sellPrice)}</td>
                      <td className="whitespace-nowrap p-3 text-right">{formatNumber(p.costPrice)}</td>
                      <td className="whitespace-nowrap p-3 text-right">
                        {typeof p.stockQuantity === "number" ? formatNumber(p.stockQuantity) : "—"}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="border-l-[3px] border-l-primary bg-primary/5">
                        <td colSpan={7} className="p-4">
                          <div className="flex flex-wrap items-start justify-between gap-4">
                            <div className="grid flex-1 grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-4">
                              <div>
                                <p className="text-xs text-muted-foreground">Mã hàng</p>
                                <p className="font-medium">{p.sku}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Định mức tồn</p>
                                <p className="font-medium">
                                  {p.reorderThreshold != null || p.maxStock != null
                                    ? `${p.reorderThreshold != null ? formatNumber(p.reorderThreshold) : "0"} - ${p.maxStock != null ? formatNumber(p.maxStock) : "không giới hạn"}`
                                    : "Chưa đặt"}
                                </p>
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
                                <p className="font-medium">
                                  {p.isActive ? (p.sellDirectly ? "Đang bán" : "Không bán trực tiếp") : "Ngừng bán"}
                                </p>
                              </div>
                              {p.images.length > 0 && (
                                <div className="col-span-full flex gap-2">
                                  {p.images.map((img) => (
                                    <div key={img.id} className="h-16 w-16 overflow-hidden rounded-md border">
                                      <ProductPhoto id={img.id} />
                                    </div>
                                  ))}
                                </div>
                              )}
                              <div className="col-span-full">
                                <button
                                  type="button"
                                  onClick={() => setAnalysisProduct(p)}
                                  className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                                >
                                  <ChartNoAxesCombined className="h-4 w-4" /> Xem phân tích
                                </button>
                              </div>
                              {p.description && (
                                <div className="col-span-full">
                                  <p className="text-xs text-muted-foreground">Ghi chú</p>
                                  <p className="whitespace-pre-wrap">{p.description}</p>
                                </div>
                              )}
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
                  </Fragment>
                );
              })}
          </tbody>
        </table>
      </div>

      {!isLoading && total > 0 && (
        <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} / {formatNumber(total)} sản phẩm
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" /> Trước
            </Button>
            <span>
              Trang {page}/{totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Sau <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <ProductAnalysisDialog product={analysisProduct} onClose={() => setAnalysisProduct(null)} />

      <ProductFormDialog
        open={open}
        onOpenChange={setOpen}
        product={editingProduct}
        activeBranchId={activeBranchId}
      />

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
