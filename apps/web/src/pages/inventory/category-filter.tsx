import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Plus, Search } from "lucide-react";
import type { CategorySummary } from "@smartpos/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useCreateCategory } from "@/features/products/hooks";

// "Ánh Rạng" matches "anh rang": strip Vietnamese diacritics before comparing.
const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();

// Multi-select category filter: a button that opens a searchable checklist with product counts.
// Nothing is filtered until "Áp dụng" is pressed.
export function CategoryFilter({
  categories,
  value,
  onApply,
}: {
  categories: CategorySummary[];
  value: string[];
  onApply: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Set<string>>(new Set(value));
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const createCategory = useCreateCategory();
  const rootRef = useRef<HTMLDivElement>(null);

  // Start each opening from what is currently applied.
  useEffect(() => {
    if (open) {
      setDraft(new Set(value));
      setQuery("");
      setCreating(false);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const visible = useMemo(() => {
    const q = fold(query.trim());
    return categories.filter((c) => !q || fold(c.name).includes(q));
  }, [categories, query]);

  const allVisibleChecked = visible.length > 0 && visible.every((c) => draft.has(c.id));

  function toggle(id: string) {
    setDraft((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setDraft((prev) => {
      const next = new Set(prev);
      visible.forEach((c) => (allVisibleChecked ? next.delete(c.id) : next.add(c.id)));
      return next;
    });
  }

  async function submitNew() {
    const name = newName.trim();
    if (!name) return;
    const created = await createCategory.mutateAsync(name);
    setDraft((prev) => new Set(prev).add(created.id));
    setNewName("");
    setCreating(false);
  }

  const label =
    value.length === 0
      ? "Nhóm hàng"
      : value.length === 1
        ? (categories.find((c) => c.id === value[0])?.name ?? "1 nhóm hàng")
        : value.length >= categories.length
          ? `Tất cả nhóm hàng (${categories.length})`
          : `${value.length} nhóm hàng`;

  return (
    <div ref={rootRef} className="relative">
      <Button
        type="button"
        variant="outline"
        className={cn("max-w-[220px] gap-1.5", value.length > 0 && "border-primary text-primary")}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="truncate">{label}</span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0" />
      </Button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-[320px] max-w-[calc(100vw-2rem)] rounded-lg border bg-popover p-3 text-popover-foreground shadow-lg">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-semibold">Nhóm hàng</p>
            <button
              type="button"
              onClick={() => setCreating((c) => !c)}
              className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              <Plus className="h-4 w-4" /> Tạo mới
            </button>
          </div>

          {creating && (
            <div className="mb-3 flex gap-2">
              <Input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitNew()}
                placeholder="Tên nhóm hàng mới"
              />
              <Button type="button" size="sm" disabled={!newName.trim() || createCategory.isPending} onClick={submitNew}>
                Thêm
              </Button>
            </div>
          )}

          <div className="relative mb-2">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm kiếm"
              className="pl-8"
              autoFocus={!creating}
            />
          </div>

          <div className="max-h-72 overflow-y-auto">
            {visible.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Không có nhóm hàng phù hợp</p>
            ) : (
              visible.map((c) => (
                <label key={c.id} className="flex cursor-pointer items-center gap-3 rounded px-2 py-2 text-sm hover:bg-accent">
                  <input type="checkbox" checked={draft.has(c.id)} onChange={() => toggle(c.id)} />
                  <span className="min-w-0 flex-1 truncate">{c.name}</span>
                  <span className="text-muted-foreground">({(c.productCount ?? 0).toLocaleString("en-US")})</span>
                </label>
              ))
            )}
          </div>

          <div className="mt-3 flex items-center justify-between gap-2 border-t pt-3">
            <div className="flex flex-col items-start">
              <button type="button" onClick={toggleAll} className="text-sm font-medium text-primary hover:underline">
                {allVisibleChecked ? "Bỏ chọn tất cả" : "Chọn tất cả"}
              </button>
              <span className="text-xs text-muted-foreground">
                Đã chọn {draft.size}/{categories.length} nhóm
              </span>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                onApply(Array.from(draft));
                setOpen(false);
              }}
            >
              Áp dụng{draft.size > 0 ? ` (${draft.size})` : ""}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
