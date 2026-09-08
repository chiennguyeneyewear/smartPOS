import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePosStore } from "@/stores/pos-store";

export function InvoiceTabsBar() {
  const tabs = usePosStore((s) => s.tabs);
  const activeTabId = usePosStore((s) => s.activeTabId);
  const setActiveTab = usePosStore((s) => s.setActiveTab);
  const addTab = usePosStore((s) => s.addTab);
  const closeTab = usePosStore((s) => s.closeTab);

  return (
    <div className="flex h-9 min-w-0 flex-1 items-center gap-1 overflow-x-auto">
      {tabs.map((tab, index) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={cn(
            "group flex h-8 shrink-0 items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors",
            tab.id === activeTabId
              ? "bg-white text-primary shadow-sm"
              : "text-primary-foreground/80 hover:bg-white/10 hover:text-primary-foreground",
          )}
        >
          <span>Hóa đơn {index + 1}</span>
          {tab.items.length > 0 && (
            <span
              className={cn(
                "rounded-full px-1.5 text-[10px]",
                tab.id === activeTabId ? "bg-primary/10 text-primary" : "bg-white/20 text-primary-foreground",
              )}
            >
              {tab.items.length}
            </span>
          )}
          {tabs.length > 1 && (
            <span
              role="button"
              tabIndex={-1}
              onClick={(e) => {
                e.stopPropagation();
                closeTab(tab.id);
              }}
              className="ml-1 rounded p-0.5 opacity-0 hover:bg-black/10 group-hover:opacity-100"
            >
              <X className="h-3 w-3" />
            </span>
          )}
        </button>
      ))}
      <button
        onClick={addTab}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-primary-foreground/80 hover:bg-white/10 hover:text-primary-foreground"
        title="Thêm hóa đơn mới"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}
