import { useMemo, useState } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import { usePosStore, getLineTotal, getLineUnitDiscount, type PosTab } from "@/stores/pos-store";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LineDiscountPopover } from "./line-discount-popover";

interface CartPanelProps {
  tab: PosTab;
  onRequestCheckout: () => void;
}

export function CartPanel({ tab, onRequestCheckout }: CartPanelProps) {
  const updateQuantity = usePosStore((s) => s.updateQuantity);
  const removeItem = usePosStore((s) => s.removeItem);
  const setNote = usePosStore((s) => s.setNote);
  const setDiscount = usePosStore((s) => s.setDiscount);
  const [openDiscountLineId, setOpenDiscountLineId] = useState<string | null>(null);

  const subTotal = useMemo(() => tab.items.reduce((sum, item) => sum + getLineTotal(item), 0), [tab.items]);
  const total = Math.max(0, subTotal - tab.discountAmount);

  return (
    <div className="flex h-full flex-[3] min-w-[420px] flex-col">
      <div className="flex-1 overflow-auto">
        {tab.items.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">Chưa có sản phẩm nào trong giỏ hàng.</p>
        ) : (
          <table className="w-full text-sm">
            <tbody>
              {tab.items.map((line) => {
                const unitDiscount = getLineUnitDiscount(line);
                const hasDiscount = unitDiscount > 0;
                return (
                  <tr key={line.lineId} className="border-b last:border-0">
                    <td className="p-3">
                      <p className="line-clamp-2 text-sm font-medium">{line.name}</p>
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <button
                          onClick={() => updateQuantity(tab.id, line.lineId, line.quantity - 1)}
                          className="flex h-7 w-7 items-center justify-center rounded border text-muted-foreground hover:bg-accent"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-7 text-center text-sm">{line.quantity}</span>
                        <button
                          onClick={() => updateQuantity(tab.id, line.lineId, line.quantity + 1)}
                          className="flex h-7 w-7 items-center justify-center rounded border text-muted-foreground hover:bg-accent"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="relative w-32 p-3 text-right align-top">
                      <button
                        onClick={() => setOpenDiscountLineId(line.lineId)}
                        className="text-sm text-muted-foreground hover:text-foreground hover:underline"
                      >
                        {formatCurrency(line.unitPrice)}
                      </button>
                      {hasDiscount && (
                        <p className="text-xs text-destructive">
                          -
                          {line.discountType === "PERCENT"
                            ? `${line.discountValue.toFixed(2)}%`
                            : formatCurrency(line.discountValue)}
                        </p>
                      )}
                      <LineDiscountPopover
                        tabId={tab.id}
                        line={line}
                        open={openDiscountLineId === line.lineId}
                        onOpenChange={(open) => setOpenDiscountLineId(open ? line.lineId : null)}
                      />
                    </td>
                    <td className="w-28 p-3 text-right align-top text-sm font-semibold">
                      {formatCurrency(getLineTotal(line))}
                    </td>
                    <td className="w-10 p-3 text-right align-top">
                      <button
                        onClick={() => removeItem(tab.id, line.lineId)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="space-y-2.5 border-t p-4">
        <Input
          placeholder="Ghi chú đơn hàng"
          value={tab.note}
          onChange={(e) => setNote(tab.id, e.target.value)}
          className="text-sm"
        />
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Giảm giá</span>
          <Input
            type="number"
            min={0}
            value={tab.discountAmount}
            onChange={(e) => setDiscount(tab.id, Number(e.target.value))}
            className="h-8 w-32 text-right text-sm"
          />
        </div>
        <div className="flex items-center justify-between border-t pt-2.5">
          <span className="text-base font-medium text-muted-foreground">Tổng tiền hàng</span>
          <span className="text-xl font-bold text-primary">{formatCurrency(total)}</span>
        </div>
        <Button
          size="lg"
          className="w-full text-base"
          disabled={tab.items.length === 0}
          onClick={onRequestCheckout}
        >
          THANH TOÁN
        </Button>
      </div>
    </div>
  );
}
