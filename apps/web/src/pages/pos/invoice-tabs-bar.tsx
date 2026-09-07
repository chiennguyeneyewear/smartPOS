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
    <div className="flex h-10 min-w-0 flex-1 items-center gap-1 overflow-x-auto px-2">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={cn(
            "group flex h-8 shrink-0 items-center gap-2 rounded-t-md px-3 text-xs font-medium transition-colors",
            tab.id === activeTabId
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:bg-background/60",
          )}
        >
          <span>{tab.label}</span>
          {tab.items.length > 0 && (
            <span className="rounded-full bg-primary/10 px-1.5 text-[10px] text-primary">{tab.items.length}</span>
          )}
          {tabs.length > 1 && (
            <span
              role="button"
              tabIndex={-1}
              onClick={(e) => {
                e.stopPropagation();
                closeTab(tab.id);
              }}
              className="ml-1 rounded p-0.5 opacity-0 hover:bg-accent group-hover:opacity-100"
            >
              <X className="h-3 w-3" />
            </span>
          )}
        </button>
      ))}
      <button
        onClick={addTab}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-background/60"
        title="Thêm hóa đơn mới"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}
