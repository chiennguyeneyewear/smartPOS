import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Upload } from "lucide-react";
import { GENDER, type CustomerImportRow, type CustomerImportResult } from "@smartpos/shared";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "@/stores/toast-store";
import { importCustomers } from "@/features/customers/api";

interface CustomerImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Sent as separate sequential requests instead of one giant payload — like
// KiotViet's "5,000 rows at a time" import — so a 40k-row file can't hit an
// HTTP request timeout, and the user gets visible progress instead of a
// frozen dialog for minutes.
const CHUNK_SIZE = 3000;

function toIsoDate(value: unknown): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function toGender(value: unknown): CustomerImportRow["gender"] {
  const text = String(value ?? "").trim().toLowerCase();
  if (text === "nam") return GENDER.MALE;
  if (text === "nữ" || text === "nu") return GENDER.FEMALE;
  return null;
}

// Reads a raw sheet row (keyed by the header text of a KiotViet-style
// customer export: Mã khách hàng/Tên khách hàng/Điện thoại/...) into our
// import shape. Returns null when the required "Tên khách hàng" is blank.
function mapRow(raw: Record<string, unknown>): CustomerImportRow | null {
  const name = String(raw["Tên khách hàng"] ?? "").trim();
  if (!name) return null;

  const debtRaw = raw["Nợ cần thu hiện tại"];
  const debtBalance = debtRaw === undefined || debtRaw === "" ? null : Number(debtRaw);

  return {
    code: String(raw["Mã khách hàng"] ?? "").trim() || null,
    name,
    phone: String(raw["Điện thoại"] ?? "").trim() || null,
    address: String(raw["Địa chỉ"] ?? "").trim() || null,
    ward: String(raw["Phường/Xã"] ?? "").trim() || null,
    groupName: String(raw["Nhóm khách hàng"] ?? "").trim() || null,
    birthday: toIsoDate(raw["Ngày sinh"]),
    gender: toGender(raw["Giới tính"]),
    email: String(raw["Email"] ?? "").trim() || null,
    facebook: String(raw["Facebook"] ?? "").trim() || null,
    note: String(raw["Ghi chú"] ?? "").trim() || null,
    debtBalance: debtBalance !== null && !Number.isNaN(debtBalance) ? debtBalance : null,
  };
}

export function CustomerImportDialog({ open, onOpenChange }: CustomerImportDialogProps) {
  const queryClient = useQueryClient();
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<CustomerImportRow[] | null>(null);
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
    const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]!]!;
    const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
    const parsed = raw.map(mapRow).filter((r): r is CustomerImportRow => r !== null);

    if (parsed.length === 0) {
      toast({
        title: "Không đọc được khách hàng nào",
        description: "Kiểm tra file có đúng cột \"Tên khách hàng\" không.",
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

    const totals: CustomerImportResult = { created: 0, updated: 0, errors: [] };
    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
      const slice = rows.slice(i, i + CHUNK_SIZE);
      try {
        const result = await importCustomers(slice);
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

    queryClient.invalidateQueries({ queryKey: ["customers"] });
    const errorNote = totals.errors.length > 0 ? `, ${totals.errors.length} lỗi` : "";
    toast({
      title: "Import hoàn tất",
      description: `${totals.created} khách hàng mới, ${totals.updated} cập nhật${errorNote}`,
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
          <DialogTitle>Nhập khách hàng từ Excel</DialogTitle>
        </DialogHeader>

        {!rows ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Chọn file Excel xuất từ KiotViet (cột Mã khách hàng, Tên khách hàng, Điện thoại, Địa chỉ...). Khách
              hàng trùng Mã khách hàng sẽ được cập nhật, khách hàng mới sẽ được tạo.
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
              Đang nhập {progress.done.toLocaleString("en-US")}/{progress.total.toLocaleString("en-US")} khách hàng...
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm">
              <span className="font-medium">{fileName}</span> — đọc được{" "}
              <span className="font-semibold text-primary">{rows.length}</span> khách hàng.
            </p>
            <div className="max-h-64 overflow-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="p-2 text-left font-medium">Mã KH</th>
                    <th className="p-2 text-left font-medium">Tên khách hàng</th>
                    <th className="p-2 text-left font-medium">Điện thoại</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 20).map((r, i) => (
                    <tr key={i} className="border-t">
                      <td className="whitespace-nowrap p-2">{r.code ?? "—"}</td>
                      <td className="p-2">{r.name}</td>
                      <td className="whitespace-nowrap p-2">{r.phone ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length > 20 && (
                <p className="border-t p-2 text-center text-xs text-muted-foreground">
                  ... và {rows.length - 20} khách hàng khác
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
              {`Xác nhận nhập ${rows.length} khách hàng`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
