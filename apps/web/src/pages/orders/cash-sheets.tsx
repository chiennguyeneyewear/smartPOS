import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Loader2, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { prepareImage, useObjectUrl } from "@/lib/media";
import { errorMessage } from "@/lib/error-message";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "@/stores/toast-store";
import {
  CASH_SHEET_LIMITS,
  deleteCashSheet,
  fetchCashSheetBlob,
  fetchCashSheets,
  uploadCashSheet,
  type CashSheetSummary,
} from "@/features/cash-sheets/api";

const MB = 1024 * 1024;
const ALLOWED = new Set<string>(CASH_SHEET_LIMITS.allowedMimeTypes);
const isPdf = (s: { mimeType: string }) => s.mimeType === "application/pdf";
const vnDay = (iso: string) => new Date(new Date(iso).getTime() + 7 * 3600_000).toISOString().slice(0, 10);

function useSheetBlob(id: string) {
  const { data, isLoading } = useQuery({
    queryKey: ["cash-sheet-file", id],
    queryFn: () => fetchCashSheetBlob(id),
    enabled: !!id,
    staleTime: Infinity,
    gcTime: 5 * 60_000,
  });
  return { blob: data, url: useObjectUrl(data), isLoading };
}

function Tile({ sheet, onOpen }: { sheet: CashSheetSummary; onOpen: () => void }) {
  const pdf = isPdf(sheet);
  // PDFs are not previewed as thumbnails, only photos are
  const { url, isLoading } = useSheetBlob(pdf ? "" : sheet.id);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group relative h-40 w-32 shrink-0 overflow-hidden rounded-md border bg-muted text-left"
      title={sheet.fileName}
    >
      {pdf ? (
        <span className="flex h-full w-full flex-col items-center justify-center gap-2 p-2 text-muted-foreground">
          <FileText className="h-10 w-10" />
          <span className="line-clamp-3 break-all text-center text-xs">{sheet.fileName}</span>
        </span>
      ) : isLoading || !url ? (
        <span className="flex h-full w-full items-center justify-center text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </span>
      ) : (
        <img src={url} alt={sheet.fileName} className="h-full w-full object-cover" />
      )}
      <span className="absolute inset-x-0 bottom-0 truncate bg-black/55 px-1.5 py-0.5 text-[11px] text-white">
        {sheet.uploadedByName}
      </span>
    </button>
  );
}

function Viewer({
  sheet,
  canDelete,
  onClose,
  onDelete,
}: {
  sheet: CashSheetSummary | null;
  canDelete: boolean;
  onClose: () => void;
  onDelete: () => void;
}) {
  const { url } = useSheetBlob(sheet?.id ?? "");
  return (
    <Dialog open={!!sheet} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="truncate text-sm">
            {sheet?.fileName} · {sheet?.uploadedByName}
          </DialogTitle>
        </DialogHeader>
        <div className="flex h-[70vh] items-center justify-center overflow-hidden rounded-md bg-black/5">
          {!url ? (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          ) : sheet && isPdf(sheet) ? (
            <iframe src={url} title={sheet.fileName} className="h-full w-full" />
          ) : (
            <img src={url} alt={sheet?.fileName} className="max-h-full object-contain" />
          )}
        </div>
        <DialogFooter>
          {canDelete && (
            <Button variant="outline" className="gap-1.5 border-destructive text-destructive hover:bg-destructive/5" onClick={onDelete}>
              <Trash2 className="h-4 w-4" /> Xóa file
            </Button>
          )}
          {url && sheet && (
            <Button asChild variant="outline">
              <a href={url} download={sheet.fileName}>
                Tải về
              </a>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// The scanned or photographed paper thu-chi sheet for one day. Staff add and see their own; the admin sees all.
export function CashSheets({ date }: { date: string }) {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === "admin";
  const inputRef = useRef<HTMLInputElement>(null);
  const [viewing, setViewing] = useState<CashSheetSummary | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<CashSheetSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: sheets, isLoading } = useQuery({ queryKey: ["cash-sheets", date], queryFn: () => fetchCashSheets(date) });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["cash-sheets", date] });

  const upload = useMutation({
    mutationFn: async (files: File[]) => {
      for (const file of files) await uploadCashSheet(date, await prepareImage(file, { skipBelowBytes: 1024 * 1024 }));
    },
    onSuccess: () => {
      refresh();
      toast({ title: "Đã thêm file tờ thu chi", variant: "success" });
    },
    onError: (e: unknown) => toast({ title: "Không thêm được file", description: errorMessage(e), variant: "destructive" }),
  });
  const remove = useMutation({
    mutationFn: deleteCashSheet,
    onSuccess: () => {
      refresh();
      setViewing(null);
      setConfirmDelete(null);
      toast({ title: "Đã xóa file", variant: "success" });
    },
    onError: (e: unknown) => toast({ title: "Không xóa được", description: errorMessage(e), variant: "destructive" }),
  });

  function handleChosen(list: FileList | null) {
    const files = Array.from(list ?? []);
    if (inputRef.current) inputRef.current.value = "";
    if (files.length === 0) return;
    const bad = files.find((f) => !ALLOWED.has(f.type) || f.size > CASH_SHEET_LIMITS.maxBytes * 1.5);
    if (bad) return setError(`"${bad.name}": chỉ nhận file PDF hoặc ảnh (JPG, PNG, WebP), tối đa ${CASH_SHEET_LIMITS.maxBytes / MB} MB`);
    if ((sheets ?? []).filter((s) => s.uploadedById === user?.id).length + files.length > CASH_SHEET_LIMITS.maxPerDay) {
      return setError(`Mỗi ngày tối đa ${CASH_SHEET_LIMITS.maxPerDay} file`);
    }
    setError(null);
    upload.mutate(files);
  }

  const canDelete = (s: CashSheetSummary) =>
    isAdmin || (s.uploadedById === user?.id && vnDay(s.createdAt) === vnDay(new Date().toISOString()));

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,image/*"
        multiple
        hidden
        onChange={(e) => handleChosen(e.target.files)}
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" className="gap-1.5" disabled={upload.isPending} onClick={() => inputRef.current?.click()}>
          {upload.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          Thêm file tờ thu chi
        </Button>
        <p className="text-xs text-muted-foreground">
          PDF hoặc ảnh chụp, tối đa {CASH_SHEET_LIMITS.maxBytes / MB} MB mỗi file. Trên điện thoại có thể chụp trực tiếp.
        </p>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}

      {isLoading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Đang tải dữ liệu...</p>
      ) : (sheets ?? []).length === 0 ? (
        <div className="rounded-md border border-dashed p-10 text-center text-sm text-muted-foreground">
          Chưa có tờ thu chi nào cho ngày này. Bấm “Thêm file tờ thu chi” để đưa file vào.
        </div>
      ) : (
        <div className="flex flex-wrap gap-3">
          {(sheets ?? []).map((s) => (
            <Tile key={s.id} sheet={s} onOpen={() => setViewing(s)} />
          ))}
        </div>
      )}

      <Viewer
        sheet={viewing}
        canDelete={!!viewing && canDelete(viewing)}
        onClose={() => setViewing(null)}
        onDelete={() => viewing && setConfirmDelete(viewing)}
      />

      <Dialog open={!!confirmDelete} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Xóa file tờ thu chi</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Xóa <span className="font-medium text-foreground">{confirmDelete?.fileName}</span>? Không khôi phục lại được.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>
              Bỏ qua
            </Button>
            <Button variant="destructive" disabled={remove.isPending} onClick={() => confirmDelete && remove.mutate(confirmDelete.id)}>
              Xóa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
