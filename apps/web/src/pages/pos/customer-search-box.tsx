import { forwardRef, useState } from "react";
import { Plus, Search, X } from "lucide-react";
import type { CustomerSummary } from "@smartpos/shared";
import { useCustomerSearch } from "@/features/customers/hooks";
import { useSearchDropdown } from "@/hooks/use-search-dropdown";
import { Input } from "@/components/ui/input";

interface CustomerSearchBoxProps {
  customer?: CustomerSummary;
  onSelect: (customer: CustomerSummary | undefined) => void;
  onRequestQuickAdd: () => void;
}

export const CustomerSearchBox = forwardRef<HTMLInputElement, CustomerSearchBoxProps>(function CustomerSearchBox(
  { customer, onSelect, onRequestQuickAdd },
  ref,
) {
  const [search, setSearch] = useState("");
  const { open, openNow, closeSoon, closeNow } = useSearchDropdown();
  const { data: results } = useCustomerSearch(search);

  if (customer) {
    return (
      <div className="flex items-center justify-between rounded-md border bg-accent/40 px-3 py-2 text-sm">
        <div>
          <p className="font-medium">{customer.name}</p>
          <p className="text-xs text-muted-foreground">{customer.phone}</p>
        </div>
        <button onClick={() => onSelect(undefined)} className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={ref}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              openNow();
            }}
            onFocus={openNow}
            onBlur={() => closeSoon()}
            placeholder="Tìm khách hàng (F4)"
            className="pl-8"
          />
        </div>
        <button
          onClick={onRequestQuickAdd}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border text-muted-foreground hover:bg-accent"
          title="Thêm khách hàng mới"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
      {open && search.length > 0 && (
        <div className="absolute z-20 mt-1 w-full rounded-md border bg-popover shadow-md">
          {results && results.length > 0 ? (
            results.map((c) => (
              <button
                key={c.id}
                onMouseDown={() => {
                  onSelect(c);
                  setSearch("");
                  closeNow();
                }}
                className="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-accent"
              >
                <span className="font-medium">{c.name}</span>
                <span className="text-xs text-muted-foreground">{c.phone}</span>
              </button>
            ))
          ) : (
            <p className="px-3 py-2 text-xs text-muted-foreground">Không tìm thấy khách hàng</p>
          )}
        </div>
      )}
    </div>
  );
});
