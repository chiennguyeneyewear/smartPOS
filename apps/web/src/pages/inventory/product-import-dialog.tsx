import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import type { ProductImportRow } from "@smartpos/shared";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "@/stores/toast-store";
import { useAuthStore } from "@/stores/auth-store";
import { useImportProducts } from "@/features/products/hooks";

interface ProductImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

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
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<ProductImportRow[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importProducts = useImportProducts();

  function reset() {
    setFileName("");
    setRows(null);
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

  function handleConfirm() {
    if (!rows) return;
    importProducts.mutate(
      { rows, branchId: activeBranchId ?? undefined },
      {
        onSuccess: () => {
          reset();
          onOpenChange(false);
        },
      },
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
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
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          {rows && (
            <Button onClick={handleConfirm} disabled={importProducts.isPending} className="gap-1.5">
              <Upload className="h-4 w-4" />
              {importProducts.isPending ? "Đang nhập..." : `Xác nhận nhập ${rows.length} sản phẩm`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
