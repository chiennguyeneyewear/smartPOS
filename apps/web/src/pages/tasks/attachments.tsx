import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Film, ImagePlus, Loader2, X } from "lucide-react";
import { TASK_ATTACHMENT_LIMITS, type TaskAttachmentSummary } from "@smartpos/shared";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { fetchAttachmentBlob } from "@/features/tasks/api";

const MB = 1024 * 1024;
const ALLOWED = new Set<string>(TASK_ATTACHMENT_LIMITS.allowedMimeTypes);

// Big phone photos are shrunk before upload (longest side 1600px, JPEG): a typical 4-6 MB photo
// becomes a few hundred KB, which keeps uploads quick on mobile data and the database small.
export async function prepareFile(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif" || file.size < 600 * 1024) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.jpg`, { type: "image/jpeg" });
  } catch {
    return file;
  }
}

// Returns an error message for the first file that can't be attached, or null if all are fine.
export function checkFiles(files: File[], alreadyAttached: number): string | null {
  if (alreadyAttached + files.length > TASK_ATTACHMENT_LIMITS.maxPerTask) {
    return `Mỗi công việc tối đa ${TASK_ATTACHMENT_LIMITS.maxPerTask} tệp đính kèm`;
  }
  for (const file of files) {
    if (!ALLOWED.has(file.type)) return `"${file.name}": chỉ hỗ trợ ảnh (JPG, PNG, WebP, GIF) và video (MP4, MOV, WebM)`;
    const limit = file.type.startsWith("video/") ? TASK_ATTACHMENT_LIMITS.maxVideoBytes : TASK_ATTACHMENT_LIMITS.maxImageBytes;
    if (file.size > limit) {
      return `"${file.name}" vượt quá ${limit / MB} MB (${file.type.startsWith("video/") ? "video" : "ảnh"})`;
    }
  }
  return null;
}

function useObjectUrl(source: Blob | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!source) {
      setUrl(null);
      return;
    }
    const next = URL.createObjectURL(source);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [source]);
  return url;
}

// Downloads a stored file with the auth header (an <img src> can't send it) and returns a local URL.
export function useAttachmentUrl(id: string): { url: string | null; isLoading: boolean } {
  const { data, isLoading } = useQuery({
    queryKey: ["task-attachment", id],
    queryFn: () => fetchAttachmentBlob(id),
    staleTime: Infinity,
    gcTime: 5 * 60_000,
  });
  return { url: useObjectUrl(data), isLoading };
}

function Tile({
  isVideo,
  src,
  loading,
  onOpen,
  onRemove,
}: {
  isVideo: boolean;
  src: string | null;
  loading?: boolean;
  onOpen?: () => void;
  onRemove?: () => void;
}) {
  return (
    <div className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-md border bg-muted">
      <button type="button" onClick={onOpen} disabled={!onOpen} className="h-full w-full">
        {loading || !src ? (
          <span className="flex h-full w-full items-center justify-center text-muted-foreground">
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Film className="h-5 w-5" />}
          </span>
        ) : isVideo ? (
          <video src={src} className="h-full w-full object-cover" muted preload="metadata" />
        ) : (
          <img src={src} alt="" className="h-full w-full object-cover" />
        )}
      </button>
      {isVideo && src && (
        <span className="pointer-events-none absolute bottom-1 left-1 rounded bg-black/60 px-1 text-[10px] text-white">
          Video
        </span>
      )}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white hover:bg-black/80"
          aria-label="Bỏ tệp"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

export function StoredTile({
  attachment,
  onOpen,
  onRemove,
}: {
  attachment: TaskAttachmentSummary;
  onOpen?: () => void;
  onRemove?: () => void;
}) {
  const { url, isLoading } = useAttachmentUrl(attachment.id);
  return (
    <Tile
      isVideo={attachment.mimeType.startsWith("video/")}
      src={url}
      loading={isLoading}
      onOpen={onOpen}
      onRemove={onRemove}
    />
  );
}

function PendingTile({ file, onRemove }: { file: File; onRemove: () => void }) {
  const url = useObjectUrl(file);
  return <Tile isVideo={file.type.startsWith("video/")} src={url} onRemove={onRemove} />;
}

export function AttachmentViewer({
  attachment,
  onClose,
}: {
  attachment: TaskAttachmentSummary | null;
  onClose: () => void;
}) {
  const { url } = useAttachmentUrl(attachment?.id ?? "");
  const isVideo = attachment?.mimeType.startsWith("video/");
  return (
    <Dialog open={!!attachment} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="truncate text-sm">{attachment?.fileName}</DialogTitle>
        </DialogHeader>
        <div className="flex max-h-[70vh] min-h-[160px] items-center justify-center overflow-hidden rounded-md bg-black/5">
          {!url ? (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          ) : isVideo ? (
            <video src={url} controls autoPlay playsInline className="max-h-[70vh] w-full" />
          ) : (
            <img src={url} alt={attachment?.fileName} className="max-h-[70vh] object-contain" />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Read-only strip of a task's attachments; tapping one opens it full size.
export function AttachmentGallery({ attachments }: { attachments: TaskAttachmentSummary[] }) {
  const [open, setOpen] = useState<TaskAttachmentSummary | null>(null);
  if (attachments.length === 0) return null;
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Hình ảnh / video đính kèm</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {attachments.map((a) => (
          <StoredTile key={a.id} attachment={a} onOpen={() => setOpen(a)} />
        ))}
      </div>
      <AttachmentViewer attachment={open} onClose={() => setOpen(null)} />
    </div>
  );
}

// Picker inside the task form. The button opens the OS file chooser: files from the computer on a
// desktop, and the photo library / camera / files sheet on a phone.
export function AttachmentPicker({
  existing,
  pending,
  onAddFiles,
  onRemoveExisting,
  onRemovePending,
  disabled,
}: {
  existing: TaskAttachmentSummary[];
  pending: File[];
  onAddFiles: (files: File[]) => void;
  onRemoveExisting: (id: string) => void;
  onRemovePending: (index: number) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [viewing, setViewing] = useState<TaskAttachmentSummary | null>(null);

  async function handleChosen(list: FileList | null) {
    const chosen = Array.from(list ?? []);
    if (inputRef.current) inputRef.current.value = "";
    if (chosen.length === 0) return;
    setPreparing(true);
    const prepared = await Promise.all(chosen.map(prepareFile));
    setPreparing(false);
    const problem = checkFiles(prepared, existing.length + pending.length);
    setError(problem);
    if (!problem) onAddFiles(prepared);
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        hidden
        onChange={(e) => handleChosen(e.target.files)}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={cn("gap-1.5", preparing && "opacity-70")}
        disabled={disabled || preparing}
        onClick={() => inputRef.current?.click()}
      >
        {preparing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
        Thêm hình ảnh / video
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {existing.length + pending.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {existing.map((a) => (
            <StoredTile key={a.id} attachment={a} onOpen={() => setViewing(a)} onRemove={() => onRemoveExisting(a.id)} />
          ))}
          {pending.map((file, i) => (
            <PendingTile key={`${file.name}-${file.size}-${i}`} file={file} onRemove={() => onRemovePending(i)} />
          ))}
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        Tối đa {TASK_ATTACHMENT_LIMITS.maxPerTask} tệp. Ảnh tự động thu nhỏ; video tối đa{" "}
        {TASK_ATTACHMENT_LIMITS.maxVideoBytes / MB} MB.
      </p>
      <AttachmentViewer attachment={viewing} onClose={() => setViewing(null)} />
    </div>
  );
}
