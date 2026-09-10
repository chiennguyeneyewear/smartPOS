import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Upload } from "lucide-react";
import type { ProductImportRow, ProductImportResult } from "@smartpos/shared";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "@/stores/toast-store";
import { useAuthStore } from "@/stores/auth-store";
import { importProducts } from "@/features/products/api";

interface ProductImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Sent as separate sequential requests instead of one giant payload — like
// KiotViet's "5,000 rows at a time" import — so a 40k-row file can't hit an
// HTTP request timeout, and the user gets visible progress instead of a
// frozen dialog for minutes.
const CHUNK_SIZE = 3000;

// Reads a raw sheet row (keyed by the header text of a KiotViet-style product
// export: Mã hàng/Tên hàng/Giá bán/Giá vốn/Tồn kho/ĐVT/...) into our import
// shape. Returns null for a row that's missing its required fields, so the
// caller can drop blank trailing rows instead of failing the whole import.
function mapRow(raw: Record<string, unknown>): ProductImportRow | null {
  const sku = String(raw["Mã hàng"] ?? "").trim();
  const name = String(raw["Tên hàng"] ?? "").trim();
  if (!sku || !name) return null;

  const stockRaw = raw["Tồn kho"];
  const stockQuantity = stockRaw === undefined || stockRaw === "" ? null : Number(stockRaw);
  const activeRaw = String(raw["Đang kinh doanh"] ?? "").trim();
  const images = String(raw["Hình ảnh (url1,url2...)"] ?? "")
    .split(",")
    .map((u) => u.trim())
    .filter(Boolean);

  return {
    sku,
    barcode: String(raw["Mã vạch"] ?? "").trim() || null,
    name,
    categoryName: String(raw["Nhóm hàng(3 Cấp)"] ?? "").trim() || null,
    unitName: String(raw["ĐVT"] ?? "").trim() || null,
    costPrice: Number(raw["Giá vốn"] ?? 0) || 0,
    sellPrice: Number(raw["Giá bán"] ?? 0) || 0,
    stockQuantity: stockQuantity !== null && !Number.isNaN(stockQuantity) ? stockQuantity : null,
    imageUrl: images[0] ?? null,
    isActive: activeRaw !== "0" && activeRaw.toLowerCase() !== "không",
  };
}

export function ProductImportDialog({ open, onOpenChange }: ProductImportDialogProps) {
  const activeBranchId = useAuthStore((s) => s.activeBranchId);
  const queryClient = useQueryClient();
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<ProductImportRow[] | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setFileName("");
    setRows(null);
    setProgress(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    const XLSX = await import("xlsx");
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]!]!;
    const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
    const parsed = raw.map(mapRow).filter((r): r is ProductImportRow => r !== null);

    if (parsed.length === 0) {
      toast({
        title: "Không đọc được sản phẩm nào",
        description: "Kiểm tra file có đúng cột \"Mã hàng\" và \"Tên hàng\" không.",
        variant: "destructive",
      });
      reset();
      return;
    }
    setRows(parsed);
  }

  async function handleConfirm() {
    if (!rows) return;
    setProgress({ done: 0, total: rows.length });

    const totals: ProductImportResult = { created: 0, updated: 0, errors: [] };
    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
      const slice = rows.slice(i, i + CHUNK_SIZE);
      try {
        const result = await importProducts(slice, activeBranchId ?? undefined);
        totals.created += result.created;
        totals.updated += result.updated;
        totals.errors.push(...result.errors.map((e) => ({ ...e, row: e.row + i })));
      } catch (err) {
        toast({
          title: "Import bị gián đoạn",
          description: err instanceof Error ? err.message : "Lỗi không xác định",
          variant: "destructive",
        });
        break;
      }
      setProgress({ done: Math.min(i + CHUNK_SIZE, rows.length), total: rows.length });
    }

    queryClient.invalidateQueries({ queryKey: ["products"] });
    queryClient.invalidateQueries({ queryKey: ["categories"] });
    queryClient.invalidateQueries({ queryKey: ["units"] });
    const errorNote = totals.errors.length > 0 ? `, ${totals.errors.length} lỗi` : "";
    toast({
      title: "Import hoàn tất",
      description: `${totals.created} sản phẩm mới, ${totals.updated} cập nhật${errorNote}`,
      variant: totals.errors.length > 0 ? "default" : "success",
    });
    reset();
    onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !progress) reset();
        if (!progress) onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nhập hàng hóa từ Excel</DialogTitle>
        </DialogHeader>

        {!rows ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Chọn file Excel xuất từ KiotViet (cột Mã hàng, Tên hàng, Giá bán, Giá vốn, Tồn kho, ĐVT...). Sản phẩm
              trùng Mã hàng sẽ được cập nhật, sản phẩm mới sẽ được tạo.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/90"
            />
          </div>
        ) : progress ? (
          <div className="space-y-3 py-2">
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${Math.round((progress.done / progress.total) * 100)}%` }}
              />
            </div>
            <p className="text-center text-sm text-muted-foreground">
              Đang nhập {progress.done.toLocaleString("en-US")}/{progress.total.toLocaleString("en-US")} sản phẩm...
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm">
              <span className="font-medium">{fileName}</span> — đọc được{" "}
              <span className="font-semibold text-primary">{rows.length}</span> sản phẩm.
            </p>
            <div className="max-h-64 overflow-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="p-2 text-left font-medium">Mã hàng</th>
                    <th className="p-2 text-left font-medium">Tên hàng</th>
                    <th className="p-2 text-right font-medium">Giá bán</th>
                    <th className="p-2 text-right font-medium">Tồn kho</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 20).map((r, i) => (
                    <tr key={i} className="border-t">
                      <td className="whitespace-nowrap p-2">{r.sku}</td>
                      <td className="p-2">{r.name}</td>
                      <td className="whitespace-nowrap p-2 text-right">{r.sellPrice.toLocaleString("en-US")}</td>
                      <td className="whitespace-nowrap p-2 text-right">{r.stockQuantity ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length > 20 && (
                <p className="border-t p-2 text-center text-xs text-muted-foreground">
                  ... và {rows.length - 20} sản phẩm khác
                </p>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={!!progress}>
            Hủy
          </Button>
          {rows && !progress && (
            <Button onClick={handleConfirm} className="gap-1.5">
              <Upload className="h-4 w-4" />
              {`Xác nhận nhập ${rows.length} sản phẩm`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
