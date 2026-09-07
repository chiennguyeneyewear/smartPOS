import { forwardRef, useState } from "react";
import { ScanLine, Search, ChevronLeft, ChevronRight, ImageOff, PackageSearch } from "lucide-react";
import { useProducts } from "@/features/products/hooks";
import { usePosStore } from "@/stores/pos-store";
import { formatCurrency, cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

const PAGE_SIZE = 18;

export const ProductSearchPane = forwardRef<HTMLInputElement>(function ProductSearchPane(_props, ref) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const addItem = usePosStore((s) => s.addItem);

  const hasSearch = search.trim().length > 0;
  const { data, isLoading } = useProducts({ search, page, pageSize: PAGE_SIZE }, { enabled: hasSearch });
  const totalPages = data ? Math.max(1, Math.ceil(data.meta.total / PAGE_SIZE)) : 1;

  return (
    <div className="flex h-full flex-col border-r">
      <div className="flex items-center gap-2 border-b p-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={ref}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Tìm hàng hóa (F3)"
            className="pl-8"
          />
        </div>
        <button
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border text-muted-foreground hover:bg-accent"
          title="Quét mã vạch"
        >
          <ScanLine className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-auto p-2">
        {!hasSearch && (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-muted-foreground">
            <PackageSearch className="h-8 w-8" />
            <p className="text-sm">Nhập mã hoặc tên sản phẩm để tìm kiếm</p>
          </div>
        )}
        {hasSearch && isLoading && <p className="p-4 text-sm text-muted-foreground">Đang tải sản phẩm...</p>}
        {hasSearch && !isLoading && data?.data.length === 0 && (
          <p className="p-4 text-sm text-muted-foreground">Không tìm thấy sản phẩm phù hợp.</p>
        )}
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {hasSearch &&
            data?.data.map((product) => (
            <button
              key={product.id}
              onClick={() => addItem(product)}
              className="flex flex-col items-start gap-1 rounded-md border bg-card p-2 text-left transition-colors hover:border-primary hover:shadow-sm"
            >
              <div className="flex aspect-square w-full items-center justify-center overflow-hidden rounded bg-muted">
                {product.imageUrl ? (
                  <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
                ) : (
                  <ImageOff className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              <p className="line-clamp-2 text-xs font-medium leading-tight">{product.name}</p>
              <p className="text-xs font-semibold text-primary">{formatCurrency(product.sellPrice)}</p>
            </button>
          ))}
        </div>
      </div>

      <div
        className={cn(
          "flex items-center justify-center gap-3 border-t p-2 text-xs text-muted-foreground",
          !hasSearch && "invisible",
        )}
      >
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1}
          className={cn("rounded p-1 hover:bg-accent", page <= 1 && "opacity-30")}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span>
          {page}/{totalPages}
        </span>
        <button
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page >= totalPages}
          className={cn("rounded p-1 hover:bg-accent", page >= totalPages && "opacity-30")}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
});
