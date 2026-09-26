import { useEffect, useRef, useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// Search box with an advanced panel: the main field searches code/name as you type; the
// slider icon opens a panel that can also search the product note. "Tìm kiếm" applies both.
export function ProductSearchBox({
  search,
  note,
  onSearchChange,
  onApply,
}: {
  search: string;
  note: string;
  onSearchChange: (v: string) => void;
  onApply: (search: string, note: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draftSearch, setDraftSearch] = useState(search);
  const [draftNote, setDraftNote] = useState(note);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function toggle() {
    if (!open) {
      setDraftSearch(search);
      setDraftNote(note);
    }
    setOpen((o) => !o);
  }

  function submit() {
    onApply(draftSearch.trim(), draftNote.trim());
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative w-full max-w-sm flex-1">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Theo mã, tên hàng"
        className="pl-8 pr-10"
      />
      <button
        type="button"
        onClick={toggle}
        aria-label="Tìm kiếm nâng cao"
        className={cn(
          "absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-accent",
          (open || note) && "bg-accent text-primary",
        )}
      >
        <SlidersHorizontal className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1.5 min-w-[320px] rounded-lg border bg-popover text-popover-foreground shadow-lg">
          <div className="space-y-3 p-4">
            <Input
              autoFocus
              value={draftSearch}
              onChange={(e) => setDraftSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="Theo mã, tên hàng"
            />
            <Input
              value={draftNote}
              onChange={(e) => setDraftNote(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="Theo ghi chú, mô tả đặt hàng"
            />
          </div>
          <div className="flex justify-end border-t p-3">
            <Button type="button" onClick={submit}>
              Tìm kiếm
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
