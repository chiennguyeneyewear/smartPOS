import { useState } from "react";
import { ChevronLeft, ChevronRight, ImageOff } from "lucide-react";
import type { CustomerSummary } from "@smartpos/shared";
import { useProducts } from "@/features/products/hooks";
import { usePosStore } from "@/stores/pos-store";
import { formatCurrency, cn } from "@/lib/utils";
import { CustomerSearchBox } from "./customer-search-box";

const PAGE_SIZE = 18;

interface ProductGridPanelProps {
  tab: { customer?: CustomerSummary };
  tabId: string;
  customerInputRef: React.Ref<HTMLInputElement>;
  onRequestQuickAddCustomer: () => void;
}

// Always-populated quick-pick catalog (best sellers / manually arranged), matching
// the right-hand panel of the real in-store POS — product lookup itself happens via
// the global search bar in the top toolbar instead of a search box in this panel.
export function ProductGridPanel({ tab, tabId, customerInputRef, onRequestQuickAddCustomer }: ProductGridPanelProps) {
  const [page, setPage] = useState(1);
  const addItem = usePosStore((s) => s.addItem);
  const setCustomer = usePosStore((s) => s.setCustomer);

  const { data, isLoading } = useProducts({ page, pageSize: PAGE_SIZE });
  const totalPages = data ? Math.max(1, Math.ceil(data.meta.total / PAGE_SIZE)) : 1;

  return (
    <div className="flex h-full flex-[2] min-w-[360px] flex-col border-l">
      <div className="border-b p-2">
        <CustomerSearchBox
          ref={customerInputRef}
          customer={tab.customer}
          onSelect={(c) => setCustomer(tabId, c)}
          onRequestQuickAdd={onRequestQuickAddCustomer}
        />
      </div>

      <div className="flex-1 overflow-auto p-2">
        {isLoading && <p className="p-4 text-sm text-muted-foreground">Đang tải sản phẩm...</p>}
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {data?.data.map((product) => (
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

      <div className="flex items-center justify-center gap-3 border-t p-2 text-xs text-muted-foreground">
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
}
