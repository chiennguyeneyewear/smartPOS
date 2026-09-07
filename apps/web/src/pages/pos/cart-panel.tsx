import { forwardRef, useMemo, useState } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import type { CustomerSummary } from "@smartpos/shared";
import { usePosStore, type PosTab } from "@/stores/pos-store";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CustomerSearchBox } from "./customer-search-box";

interface CartPanelProps {
  tab: PosTab;
  customerInputRef: React.Ref<HTMLInputElement>;
  onRequestQuickAddCustomer: () => void;
  onRequestCheckout: () => void;
}

export function CartPanel({ tab, customerInputRef, onRequestQuickAddCustomer, onRequestCheckout }: CartPanelProps) {
  const updateQuantity = usePosStore((s) => s.updateQuantity);
  const removeItem = usePosStore((s) => s.removeItem);
  const setCustomer = usePosStore((s) => s.setCustomer);
  const setNote = usePosStore((s) => s.setNote);
  const setDiscount = usePosStore((s) => s.setDiscount);
  const [noteDraft, setNoteDraft] = useState(tab.note);

  const subTotal = useMemo(
    () => tab.items.reduce((sum, item) => sum + item.quantity * item.unitPrice - item.discount, 0),
    [tab.items],
  );
  const total = Math.max(0, subTotal - tab.discountAmount);

  return (
    <div className="flex h-full w-[380px] shrink-0 flex-col">
      <div className="border-b p-2">
        <CustomerSearchBox
          ref={customerInputRef}
          customer={tab.customer as CustomerSummary | undefined}
          onSelect={(c) => setCustomer(tab.id, c)}
          onRequestQuickAdd={onRequestQuickAddCustomer}
        />
      </div>

      <div className="flex-1 overflow-auto">
        {tab.items.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">Chưa có sản phẩm nào trong giỏ hàng.</p>
        ) : (
          <table className="w-full text-sm">
            <tbody>
              {tab.items.map((line) => (
                <tr key={line.lineId} className="border-b last:border-0">
                  <td className="p-2">
                    <p className="line-clamp-2 text-xs font-medium">{line.name}</p>
                    <p className="text-xs text-muted-foreground">{formatCurrency(line.unitPrice)}</p>
                  </td>
                  <td className="w-24 p-2">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => updateQuantity(tab.id, line.lineId, line.quantity - 1)}
                        className="flex h-6 w-6 items-center justify-center rounded border text-muted-foreground hover:bg-accent"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-6 text-center text-xs">{line.quantity}</span>
                      <button
                        onClick={() => updateQuantity(tab.id, line.lineId, line.quantity + 1)}
                        className="flex h-6 w-6 items-center justify-center rounded border text-muted-foreground hover:bg-accent"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </td>
                  <td className="w-20 p-2 text-right text-xs font-semibold">
                    {formatCurrency(line.quantity * line.unitPrice - line.discount)}
                  </td>
                  <td className="w-8 p-2 text-right">
                    <button
                      onClick={() => removeItem(tab.id, line.lineId)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="space-y-2 border-t p-3">
        <Input
          placeholder="Ghi chú đơn hàng"
          value={noteDraft}
          onChange={(e) => setNoteDraft(e.target.value)}
          onBlur={() => setNote(tab.id, noteDraft)}
          className="text-xs"
        />
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Giảm giá</span>
          <Input
            type="number"
            min={0}
            value={tab.discountAmount}
            onChange={(e) => setDiscount(tab.id, Number(e.target.value))}
            className="h-7 w-28 text-right text-xs"
          />
        </div>
        <div className="flex items-center justify-between border-t pt-2">
          <span className="text-sm font-medium text-muted-foreground">Tổng tiền hàng</span>
          <span className="text-lg font-bold text-primary">{formatCurrency(total)}</span>
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
