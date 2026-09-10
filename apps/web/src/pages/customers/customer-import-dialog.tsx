import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { GENDER, type CustomerImportRow } from "@smartpos/shared";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "@/stores/toast-store";
import { useImportCustomers } from "@/features/customers/hooks";

interface CustomerImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

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
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<CustomerImportRow[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importCustomers = useImportCustomers();

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

  function handleConfirm() {
    if (!rows) return;
    importCustomers.mutate(rows, {
      onSuccess: () => {
        reset();
        onOpenChange(false);
      },
    });
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
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          {rows && (
            <Button onClick={handleConfirm} disabled={importCustomers.isPending} className="gap-1.5">
              <Upload className="h-4 w-4" />
              {importCustomers.isPending ? "Đang nhập..." : `Xác nhận nhập ${rows.length} khách hàng`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
