import { useRef, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import type { CustomerSummary, PaymentMethod } from "@smartpos/shared";
import { useAuthStore } from "@/stores/auth-store";
import { usePosStore, getActiveTab } from "@/stores/pos-store";
import { useCreateDraftInvoice, useCheckoutInvoice } from "@/features/sales/hooks";
import { toast } from "@/stores/toast-store";
import { InvoiceTabsBar } from "./invoice-tabs-bar";
import { ProductSearchPane } from "./product-search-pane";
import { CartPanel } from "./cart-panel";
import { SaleModeTabs } from "./sale-mode-tabs";
import { CheckoutDialog } from "./checkout-dialog";
import { CustomerFormDialog } from "@/components/shared/customer-form-dialog";

export function PosPage() {
  const activeBranchId = useAuthStore((s) => s.activeBranchId);
  const tabs = usePosStore((s) => s.tabs);
  const activeTabId = usePosStore((s) => s.activeTabId);
  const setSaleMode = usePosStore((s) => s.setSaleMode);
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
          discount: line.discount,
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

  const total = Math.max(
    0,
    tab.items.reduce((sum, item) => sum + item.quantity * item.unitPrice - item.discount, 0) - tab.discountAmount,
  );

  return (
    <div className="flex h-full flex-col">
      <InvoiceTabsBar />
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-hidden">
          <ProductSearchPane ref={productSearchRef} />
        </div>
        <CartPanel
          tab={tab}
          customerInputRef={customerSearchRef}
          onRequestQuickAddCustomer={() => setQuickAddOpen(true)}
          onRequestCheckout={handleOpenCheckout}
        />
      </div>
      <SaleModeTabs value={tab.saleMode} onChange={(mode) => setSaleMode(tab.id, mode)} />

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
