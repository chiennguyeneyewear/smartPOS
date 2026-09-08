import { useRef, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { Link } from "react-router-dom";
import { LayoutGrid } from "lucide-react";
import type { CustomerSummary, PaymentMethod } from "@smartpos/shared";
import { useAuthStore } from "@/stores/auth-store";
import { usePosStore, getActiveTab, getLineTotal, getLineUnitDiscount } from "@/stores/pos-store";
import { useCreateDraftInvoice, useCheckoutInvoice } from "@/features/sales/hooks";
import { toast } from "@/stores/toast-store";
import { UserMenu } from "@/components/shared/user-menu";
import { InvoiceTabsBar } from "./invoice-tabs-bar";
import { ProductQuickSearch } from "./product-quick-search";
import { ProductGridPanel } from "./product-grid-panel";
import { CartPanel } from "./cart-panel";
import { CheckoutDialog } from "./checkout-dialog";
import { CustomerFormDialog } from "@/components/shared/customer-form-dialog";

export function PosPage() {
  const activeBranchId = useAuthStore((s) => s.activeBranchId);
  const tabs = usePosStore((s) => s.tabs);
  const activeTabId = usePosStore((s) => s.activeTabId);
  const setCustomer = usePosStore((s) => s.setCustomer);
  const resetTab = usePosStore((s) => s.resetTab);

  const tab = tabs.find((t) => t.id === activeTabId) ?? tabs[0]!;

  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [pendingInvoiceId, setPendingInvoiceId] = useState<string | null>(null);

  const productSearchRef = useRef<HTMLInputElement>(null);
  const customerSearchRef = useRef<HTMLInputElement>(null);

  const createDraft = useCreateDraftInvoice();
  const checkout = useCheckoutInvoice();

  useHotkeys("f3", (e) => {
    e.preventDefault();
    productSearchRef.current?.focus();
  });
  useHotkeys("f4", (e) => {
    e.preventDefault();
    customerSearchRef.current?.focus();
  });
  useHotkeys(
    "f8",
    (e) => {
      e.preventDefault();
      handleOpenCheckout();
    },
    { enableOnFormTags: true },
  );

  function handleOpenCheckout() {
    const currentTab = getActiveTab();
    if (currentTab.items.length === 0 || !activeBranchId) return;

    createDraft.mutate(
      {
        branchId: activeBranchId,
        customerId: currentTab.customer?.id,
        saleMode: currentTab.saleMode,
        note: currentTab.note,
        discountAmount: currentTab.discountAmount,
        items: currentTab.items.map((line) => ({
          productId: line.productId,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          discount: getLineUnitDiscount(line) * line.quantity,
        })),
      },
      {
        onSuccess: (invoice) => {
          setPendingInvoiceId(invoice.id);
          setCheckoutOpen(true);
        },
        onError: () => {
          toast({ title: "Không thể tạo hóa đơn", variant: "destructive" });
        },
      },
    );
  }

  function handleConfirmCheckout(payments: { method: PaymentMethod; amount: number }[]) {
    if (!pendingInvoiceId) return;
    checkout.mutate(
      { id: pendingInvoiceId, input: { payments } },
      {
        onSuccess: () => {
          setCheckoutOpen(false);
          setPendingInvoiceId(null);
          resetTab(tab.id);
        },
      },
    );
  }

  const total = Math.max(0, tab.items.reduce((sum, item) => sum + getLineTotal(item), 0) - tab.discountAmount);

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 shrink-0 items-center gap-2 bg-primary px-2">
        <Link
          to="/inventory/products"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-primary-foreground/80 hover:bg-white/10 hover:text-primary-foreground"
          title="Quay lại quản lý"
        >
          <LayoutGrid className="h-5 w-5" />
        </Link>
        <ProductQuickSearch ref={productSearchRef} className="max-w-xs" />
        <InvoiceTabsBar />
        <div className="flex shrink-0 items-center gap-1.5">
          <UserMenu className="text-primary-foreground hover:bg-white/10 hover:text-primary-foreground" />
        </div>
      </div>
      <div className="flex flex-1 overflow-hidden">
        <CartPanel key={tab.id} tab={tab} onRequestCheckout={handleOpenCheckout} />
        <ProductGridPanel
          customer={tab.customer}
          tabId={tab.id}
          customerInputRef={customerSearchRef}
          onRequestQuickAddCustomer={() => setQuickAddOpen(true)}
        />
      </div>

      <CheckoutDialog
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        totalAmount={total}
        hasCustomer={!!tab.customer}
        isSubmitting={checkout.isPending}
        onConfirm={handleConfirmCheckout}
      />

      <CustomerFormDialog
        open={quickAddOpen}
        onOpenChange={setQuickAddOpen}
        onCreated={(customer: CustomerSummary) => setCustomer(tab.id, customer)}
      />
    </div>
  );
}
