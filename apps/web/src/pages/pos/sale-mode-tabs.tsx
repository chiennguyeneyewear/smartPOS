import { Zap, Clock, Truck } from "lucide-react";
import { SALE_MODE, type SaleMode } from "@smartpos/shared";
import { cn } from "@/lib/utils";

const MODES: { value: SaleMode; label: string; icon: typeof Zap }[] = [
  { value: SALE_MODE.QUICK, label: "Bán nhanh", icon: Zap },
  { value: SALE_MODE.NORMAL, label: "Bán thường", icon: Clock },
  { value: SALE_MODE.DELIVERY, label: "Bán giao hàng", icon: Truck },
];

interface SaleModeTabsProps {
  value: SaleMode;
  onChange: (mode: SaleMode) => void;
}

export function SaleModeTabs({ value, onChange }: SaleModeTabsProps) {
  return (
    <div className="flex h-11 shrink-0 items-center gap-1 border-t bg-card px-2">
      {MODES.map(({ value: mode, label, icon: Icon }) => (
        <button
          key={mode}
          onClick={() => onChange(mode)}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
            value === mode ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent",
          )}
        >
          <Icon className="h-3.5 w-3.5" />
          {label}
        </button>
      ))}
    </div>
  );
}
