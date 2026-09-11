import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { usePrintSettingsStore } from "@/stores/print-settings-store";
import { useAuthStore } from "@/stores/auth-store";
import { useBranches } from "@/features/branches/hooks";

const LETTERS = "ABCDEFGHIJ";

interface PrintSettingsPopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn("relative h-5 w-9 shrink-0 rounded-full transition-colors", checked ? "bg-primary" : "bg-muted")}
    >
      <span
        className={cn(
          "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-4" : "translate-x-0.5",
        )}
      />
    </button>
  );
}

export function PrintSettingsPopover({ open, onOpenChange }: PrintSettingsPopoverProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { autoPrint, mergeSameItems, copies, receiptBranchId, setAutoPrint, setMergeSameItems, setCopies, setReceiptBranchId } =
    usePrintSettingsStore();
  const activeBranchId = useAuthStore((s) => s.activeBranchId);
  const { data: branches } = useBranches();
  const effectiveBranchId = receiptBranchId ?? activeBranchId;

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onOpenChange(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div
      ref={containerRef}
      className="absolute right-0 top-full z-30 mt-1 w-80 space-y-4 rounded-xl border bg-popover p-4 text-popover-foreground shadow-lg"
    >
      <div className="flex items-center justify-between">
        <span className="text-sm">Tự động in hóa đơn</span>
        <ToggleSwitch checked={autoPrint} onChange={setAutoPrint} />
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm">Gộp hàng cùng loại</span>
        <ToggleSwitch checked={mergeSameItems} onChange={setMergeSameItems} />
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm">Số bản in (Liên)</span>
        <input
          type="number"
          min={1}
          max={9}
          value={copies}
          onChange={(e) => setCopies(Number(e.target.value))}
          className="h-8 w-16 rounded-md border px-2 text-center text-sm"
        />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Chọn mẫu in</p>
        <div className="space-y-2">
          {branches?.map((branch, i) => (
            <button
              type="button"
              key={branch.id}
              onClick={() => setReceiptBranchId(branch.id)}
              className={cn(
                "w-full rounded-full border px-4 py-2 text-left text-sm transition-colors",
                effectiveBranchId === branch.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-input text-foreground hover:bg-accent",
              )}
            >
              {LETTERS[i] ?? i + 1}. {branch.name} ({branch.code})
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-2 border-t pt-3">
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="rounded-md border border-input px-4 py-1.5 text-sm hover:bg-accent"
        >
          Bỏ qua
        </button>
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="rounded-md bg-primary px-4 py-1.5 text-sm text-primary-foreground hover:bg-primary/90"
        >
          Xong
        </button>
      </div>
    </div>
  );
}
