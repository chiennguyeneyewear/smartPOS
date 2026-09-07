import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { ScanLine, Search, ImageOff } from "lucide-react";
import { useProducts } from "@/features/products/hooks";
import { usePosStore } from "@/stores/pos-store";
import { formatCurrency } from "@/lib/utils";
import { Input } from "@/components/ui/input";

// The global "type a code, hit Enter" quick-add bar in the POS top toolbar —
// mirrors scanning a barcode at the register: type, see matches, add, keep typing.
export const ProductQuickSearch = forwardRef<HTMLInputElement, { className?: string }>(function ProductQuickSearch(
  { className },
  forwardedRef,
) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const addItem = usePosStore((s) => s.addItem);
  const inputRef = useRef<HTMLInputElement>(null);
  useImperativeHandle(forwardedRef, () => inputRef.current!);

  const hasSearch = search.trim().length > 0;
  const { data } = useProducts({ search, page: 1, pageSize: 8 }, { enabled: hasSearch });
  const results = data?.data ?? [];

  function handleAdd(productId: string) {
    const product = results.find((p) => p.id === productId);
    if (!product) return;
    addItem(product);
    setSearch("");
    setOpen(false);
    inputRef.current?.focus();
  }

  return (
    <div className={`relative flex items-center gap-2 ${className ?? ""}`}>
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && results.length === 1) {
              e.preventDefault();
              handleAdd(results[0]!.id);
            }
          }}
          placeholder="Tìm hàng hóa (F3)"
          className="h-8 pl-8"
        />
      </div>
      <button
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white text-primary shadow-sm hover:bg-white/90"
        title="Quét mã vạch"
      >
        <ScanLine className="h-4 w-4" />
      </button>

      {open && hasSearch && (
        <div className="absolute left-0 top-full z-30 mt-1 max-h-80 w-full min-w-[320px] overflow-auto rounded-md border bg-popover shadow-lg">
          {results.length === 0 ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">Không tìm thấy sản phẩm phù hợp.</p>
          ) : (
            results.map((product) => (
              <button
                key={product.id}
                onMouseDown={() => handleAdd(product.id)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded bg-muted">
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <ImageOff className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <span className="flex-1 truncate">{product.name}</span>
                <span className="shrink-0 text-xs font-medium text-primary">{formatCurrency(product.sellPrice)}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
});
