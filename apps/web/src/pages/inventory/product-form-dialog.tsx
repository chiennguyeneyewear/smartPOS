import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronUp, ImagePlus, Loader2, X } from "lucide-react";
import { PRODUCT_IMAGE_LIMITS, productCreateSchema, type ProductSummary } from "@smartpos/shared";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { prepareImage, useObjectUrl } from "@/lib/media";
import {
  deleteProductImage,
  fetchProductImageBlob,
  uploadProductImage,
} from "@/features/products/api";
import {
  useCategories,
  useCreateCategory,
  useCreateProduct,
  useUnits,
  useUpdateProduct,
} from "@/features/products/hooks";

const MB = 1024 * 1024;
type Tab = "info" | "desc";

function useStoredImageUrl(id: string): string | null {
  const { data } = useQuery({
    queryKey: ["product-image", id],
    queryFn: () => fetchProductImageBlob(id),
    staleTime: Infinity,
    gcTime: 5 * 60_000,
  });
  return useObjectUrl(data);
}

// A stored product photo (fetched with auth), sized to fill its container.
export function ProductPhoto({ id }: { id: string }) {
  return <Photo source={{ id }} />;
}

// One photo: either already stored (fetched with auth) or a file picked in this session.
function Photo({ source, className }: { source: { id: string } | { file: File }; className?: string }) {
  const storedUrl = useStoredImageUrl("id" in source ? source.id : "");
  const localUrl = useObjectUrl("file" in source ? source.file : null);
  const url = "id" in source ? storedUrl : localUrl;
  return url ? (
    <img src={url} alt="" className={cn("h-full w-full object-cover", className)} />
  ) : (
    <span className="flex h-full w-full items-center justify-center text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
    </span>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="rounded-lg border p-4">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-start justify-between text-left">
        <div>
          <p className="font-semibold">{title}</p>
          {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
        </div>
        <ChevronUp className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", !open && "rotate-180")} />
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  );
}

function Field({ label, children, action }: { label: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex h-5 items-center justify-between">
        <Label className="whitespace-nowrap text-xs font-normal">{label}</Label>
        {action}
      </div>
      {children}
    </div>
  );
}

const numberInputClass = "text-right";

export function ProductFormDialog({
  open,
  onOpenChange,
  product,
  activeBranchId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: ProductSummary | null;
  activeBranchId: string | null;
}) {
  const queryClient = useQueryClient();
  const { data: categories } = useCategories();
  const { data: units } = useUnits();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const createCategory = useCreateCategory();
  const fileInput = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<Tab>("info");
  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [unitId, setUnitId] = useState("");
  const [costPrice, setCostPrice] = useState("0");
  const [sellPrice, setSellPrice] = useState("0");
  const [initialStock, setInitialStock] = useState("0");
  const [minStock, setMinStock] = useState("");
  const [maxStock, setMaxStock] = useState("");
  const [description, setDescription] = useState("");
  const [sellDirectly, setSellDirectly] = useState(true);
  const [pendingImages, setPendingImages] = useState<File[]>([]);
  const [removedImageIds, setRemovedImageIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newCategoryOpen, setNewCategoryOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  const isEdit = !!product;

  function resetForm(source: ProductSummary | null) {
    setTab("info");
    setSku(source?.sku ?? "");
    setName(source?.name ?? "");
    setCategoryId(source?.categoryId ?? "");
    setUnitId(source?.unitId ?? "");
    setCostPrice(String(source?.costPrice ?? 0));
    setSellPrice(String(source?.sellPrice ?? 0));
    setInitialStock("0");
    setMinStock(source?.reorderThreshold != null ? String(source.reorderThreshold) : "");
    setMaxStock(source?.maxStock != null ? String(source.maxStock) : "");
    setDescription(source?.description ?? "");
    setSellDirectly(source?.sellDirectly ?? true);
    setPendingImages([]);
    setRemovedImageIds([]);
    setError(null);
  }

  useEffect(() => {
    if (open) resetForm(product);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, product]);

  // New products default to the first/"Cái" unit so the field is never blank by accident.
  useEffect(() => {
    if (open && !isEdit && !unitId && units?.length) {
      setUnitId((units.find((u) => u.name === "Cái") ?? units[0]!).id);
    }
  }, [open, isEdit, unitId, units]);

  const keptImages = useMemo(
    () => (product?.images ?? []).filter((i) => !removedImageIds.includes(i.id)),
    [product, removedImageIds],
  );
  const photos: ({ id: string } | { file: File })[] = [...keptImages, ...pendingImages.map((file) => ({ file }))];

  async function addFiles(list: FileList | null) {
    const chosen = Array.from(list ?? []);
    if (fileInput.current) fileInput.current.value = "";
    if (chosen.length === 0) return;
    if (photos.length + chosen.length > PRODUCT_IMAGE_LIMITS.maxPerProduct) {
      setError(`Mỗi sản phẩm tối đa ${PRODUCT_IMAGE_LIMITS.maxPerProduct} ảnh`);
      return;
    }
    const prepared = await Promise.all(chosen.map((f) => prepareImage(f, { maxSide: 1400, skipBelowBytes: 300 * 1024 })));
    for (const file of prepared) {
      if (!(PRODUCT_IMAGE_LIMITS.allowedMimeTypes as readonly string[]).includes(file.type)) {
        setError(`"${file.name}": chỉ hỗ trợ ảnh JPG, PNG hoặc WebP`);
        return;
      }
      if (file.size > PRODUCT_IMAGE_LIMITS.maxBytes) {
        setError(`"${file.name}" vượt quá ${PRODUCT_IMAGE_LIMITS.maxBytes / MB} MB`);
        return;
      }
    }
    setError(null);
    setPendingImages((prev) => [...prev, ...prepared]);
  }

  function removePhoto(index: number) {
    if (index < keptImages.length) setRemovedImageIds((prev) => [...prev, keptImages[index]!.id]);
    else setPendingImages((prev) => prev.filter((_, i) => i !== index - keptImages.length));
  }

  async function save(andCreateAnother: boolean) {
    if (!categoryId) {
      setError("Chọn nhóm hàng");
      setTab("info");
      return;
    }
    const num = (v: string) => (v.trim() === "" ? undefined : Number(v));
    const parsed = productCreateSchema.safeParse({
      sku,
      name,
      categoryId,
      unitId,
      costPrice: num(costPrice) ?? 0,
      sellPrice: num(sellPrice) ?? 0,
      reorderThreshold: num(minStock) ?? null,
      maxStock: num(maxStock) ?? null,
      description,
      sellDirectly,
      isActive: true,
      initialStock: isEdit ? undefined : (num(initialStock) ?? 0),
      branchId: activeBranchId ?? undefined,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ");
      setTab("info");
      return;
    }
    if (parsed.data.maxStock != null && parsed.data.reorderThreshold != null && parsed.data.maxStock < parsed.data.reorderThreshold) {
      setError("Định mức tồn cao nhất phải lớn hơn định mức tồn thấp nhất");
      return;
    }

    setError(null);
    setSaving(true);
    try {
      let productId: string;
      if (product) {
        const { initialStock: _i, branchId: _b, ...update } = parsed.data;
        productId = (await updateProduct.mutateAsync({ id: product.id, input: update })).id;
      } else {
        productId = (await createProduct.mutateAsync(parsed.data)).id;
      }
      for (const id of removedImageIds) await deleteProductImage(id).catch(() => undefined);
      let failed = 0;
      for (const file of pendingImages) {
        try {
          await uploadProductImage(productId, file);
        } catch {
          failed += 1;
        }
      }
      await queryClient.invalidateQueries({ queryKey: ["products"] });
      if (failed > 0) setError(`Không tải lên được ${failed} ảnh, mở lại sản phẩm để thêm lại`);
      if (andCreateAnother) resetForm(null);
      else onOpenChange(false);
    } catch (e) {
      const message =
        e && typeof e === "object" && "response" in e
          ? (e as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      setError(message ?? "Không thể lưu sản phẩm");
    } finally {
      setSaving(false);
    }
  }

  async function addCategory() {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    const created = await createCategory.mutateAsync(trimmed).catch(() => null);
    if (created) {
      setCategoryId(created.id);
      setNewCategoryName("");
      setNewCategoryOpen(false);
    }
  }

  const sortedCategories = [...(categories ?? [])].sort((a, b) => a.name.localeCompare(b.name, "vi"));

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>{isEdit ? "Sửa hàng hóa" : "Tạo hàng hóa"}</DialogTitle>
          </DialogHeader>

          <div className="flex gap-6 border-b">
            {(
              [
                ["info", "Thông tin"],
                ["desc", "Mô tả"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={cn(
                  "-mb-px border-b-2 px-1 pb-2 text-sm font-medium transition-colors",
                  tab === key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === "info" ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_260px]">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Mã hàng">
                      <Input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="Tự động" />
                    </Field>
                  </div>
                  <Field label="Tên hàng">
                    <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Bắt buộc" />
                  </Field>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field
                      label="Nhóm hàng"
                      action={
                        <button
                          type="button"
                          onClick={() => setNewCategoryOpen(true)}
                          className="text-xs font-medium text-primary hover:underline"
                        >
                          Tạo mới
                        </button>
                      }
                    >
                      <Select value={categoryId} onValueChange={setCategoryId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn nhóm hàng (Bắt buộc)" />
                        </SelectTrigger>
                        <SelectContent>
                          {sortedCategories.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Đơn vị tính">
                      <Select value={unitId} onValueChange={setUnitId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn đơn vị tính" />
                        </SelectTrigger>
                        <SelectContent>
                          {units?.map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>
                </div>

                <div className="flex gap-2">
                  <div className="relative flex min-h-[180px] flex-1 flex-col items-center justify-center overflow-hidden rounded-lg border bg-muted/40 p-2 text-center">
                    {photos[0] ? (
                      <div className="absolute inset-0">
                        <Photo source={photos[0]} />
                      </div>
                    ) : null}
                    {photos.length < PRODUCT_IMAGE_LIMITS.maxPerProduct && (
                      <div className={cn("relative z-10 flex flex-col items-center gap-2", photos[0] && "mt-auto")}>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-1.5 bg-background"
                          onClick={() => fileInput.current?.click()}
                        >
                          <ImagePlus className="h-4 w-4" /> Thêm ảnh
                        </Button>
                        {!photos[0] && (
                          <p className="text-xs text-muted-foreground">Mỗi ảnh không quá {PRODUCT_IMAGE_LIMITS.maxBytes / MB} MB</p>
                        )}
                      </div>
                    )}
                    <input
                      ref={fileInput}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      hidden
                      onChange={(e) => addFiles(e.target.files)}
                    />
                  </div>
                  <div className="flex w-11 flex-col gap-2">
                    {Array.from({ length: PRODUCT_IMAGE_LIMITS.maxPerProduct }, (_, i) => photos[i]).map((photo, i) => (
                      <div key={i} className="group relative h-10 w-10 overflow-hidden rounded-md border bg-muted/60">
                        {photo && (
                          <>
                            <Photo source={photo} />
                            <button
                              type="button"
                              onClick={() => removePhoto(i)}
                              className="absolute inset-0 hidden items-center justify-center bg-black/50 text-white group-hover:flex"
                              aria-label="Bỏ ảnh"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <Section title="Giá vốn, giá bán">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <Field label="Giá vốn">
                    <Input type="number" min={0} value={costPrice} onChange={(e) => setCostPrice(e.target.value)} className={numberInputClass} />
                  </Field>
                  <Field label="Giá bán">
                    <Input type="number" min={0} value={sellPrice} onChange={(e) => setSellPrice(e.target.value)} className={numberInputClass} />
                  </Field>
                </div>
              </Section>

              <Section
                title="Tồn kho"
                hint="Quản lý số lượng tồn kho và định mức tồn. Khi tồn kho chạm đến định mức, bạn sẽ nhận được cảnh báo."
              >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <Field label="Tồn kho">
                    {isEdit ? (
                      <Input value={String(product?.stockQuantity ?? 0)} disabled className={numberInputClass} />
                    ) : (
                      <Input type="number" min={0} value={initialStock} onChange={(e) => setInitialStock(e.target.value)} className={numberInputClass} />
                    )}
                  </Field>
                  <Field label="Định mức tồn thấp nhất">
                    <Input type="number" min={0} value={minStock} onChange={(e) => setMinStock(e.target.value)} placeholder="0" className={numberInputClass} />
                  </Field>
                  <Field label="Định mức tồn cao nhất">
                    <Input type="number" min={0} value={maxStock} onChange={(e) => setMaxStock(e.target.value)} placeholder="999,999,999" className={numberInputClass} />
                  </Field>
                </div>
              </Section>
            </div>
          ) : (
            <Textarea
              rows={12}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mô tả hàng hóa..."
            />
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter className="items-center gap-3 sm:justify-between">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={sellDirectly} onChange={(e) => setSellDirectly(e.target.checked)} />
              Bán trực tiếp
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                Bỏ qua
              </Button>
              {!isEdit && (
                <Button variant="outline" onClick={() => save(true)} disabled={saving}>
                  Lưu & Tạo thêm hàng
                </Button>
              )}
              <Button onClick={() => save(false)} disabled={saving}>
                {saving ? "Đang lưu..." : "Lưu"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={newCategoryOpen} onOpenChange={setNewCategoryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tạo nhóm hàng</DialogTitle>
          </DialogHeader>
          <Input
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addCategory()}
            placeholder="Tên nhóm hàng"
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewCategoryOpen(false)}>
              Bỏ qua
            </Button>
            <Button onClick={addCategory} disabled={createCategory.isPending || !newCategoryName.trim()}>
              Lưu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
