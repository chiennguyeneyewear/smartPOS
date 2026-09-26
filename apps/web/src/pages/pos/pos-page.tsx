import { useEffect, useRef, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { LayoutGrid, Printer } from "lucide-react";
import type { CustomerSummary } from "@smartpos/shared";
import { useAuthStore } from "@/stores/auth-store";
import { usePosStore, getActiveTab, getLineTotal, getLineUnitDiscount } from "@/stores/pos-store";
import { useCreateDraftInvoice, useCheckoutInvoice } from "@/features/sales/hooks";
import { useBranches } from "@/features/branches/hooks";
import { toast } from "@/stores/toast-store";
import { cn } from "@/lib/utils";
import { UserMenu } from "@/components/shared/user-menu";
import { Sidebar } from "@/components/layout/sidebar";
import { PrintReceiptDialog } from "@/components/shared/print-receipt-dialog";
import { usePrintReceiptStore, mergeSameProductItems, type ReceiptData } from "@/stores/print-receipt-store";
import { usePrintSettingsStore } from "@/stores/print-settings-store";
import { InvoiceTabsBar } from "./invoice-tabs-bar";
import { ProductQuickSearch } from "./product-quick-search";
import { ProductGridPanel } from "./product-grid-panel";
import { CartPanel } from "./cart-panel";
import { DepositDialog } from "./deposit-dialog";
import { useCreatePreorder } from "@/features/preorders/hooks";
import { CustomerFormDialog } from "@/components/shared/customer-form-dialog";
import { PrintSettingsPopover } from "./print-settings-popover";

export function PosPage() {
  const activeBranchId = useAuthStore((s) => s.activeBranchId);
  const username = useAuthStore((s) => s.user?.username) ?? "";
  const [menuOpen, setMenuOpen] = useState(false);
  const tabs = usePosStore((s) => s.tabs);
  const activeTabId = usePosStore((s) => s.activeTabId);
  const setCustomer = usePosStore((s) => s.setCustomer);
  const resetTab = usePosStore((s) => s.resetTab);

  const tab = tabs.find((t) => t.id === activeTabId) ?? tabs[0]!;

  const [depositOpen, setDepositOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [printSettingsOpen, setPrintSettingsOpen] = useState(false);

  const productSearchRef = useRef<HTMLInputElement>(null);
  const customerSearchRef = useRef<HTMLInputElement>(null);

  const createDraft = useCreateDraftInvoice();
  const checkout = useCheckoutInvoice();
  const createPreorder = useCreatePreorder();
  const { data: branches } = useBranches();
  const printReceipt = usePrintReceiptStore((s) => s.print);
  const { autoPrint, mergeSameItems, receiptBranchId } = usePrintSettingsStore();
  // The invoice itself always posts against activeBranchId (stock, reporting);
  // receiptBranchId only controls whose name/address/phone print on the
  // receipt, for a shared till that serves 3 physical stores.
  const printBranch = branches?.find((b) => b.id === (receiptBranchId ?? activeBranchId));

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
        onSuccess: (invoice) => finishCheckout(invoice.id),
        onError: () => {
          toast({ title: "Không thể tạo hóa đơn", variant: "destructive" });
        },
      },
    );
  }

  // One tap: the invoice is issued straight away with no payment questions. How it was paid
  // (cash, transfer, split...) is confirmed afterwards from Đơn hàng.
  function finishCheckout(invoiceId: string) {
    checkout.mutate(
      { id: invoiceId, input: { payments: [] } },
      {
        onSuccess: (invoice) => {
          let items = tab.items.map((line) => ({
            productId: line.productId,
            name: line.name,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            discount: getLineUnitDiscount(line) * line.quantity,
            lineTotal: getLineTotal(line),
          }));
          if (mergeSameItems) items = mergeSameProductItems(items);

          const receipt: ReceiptData = {
            storeName: printBranch?.name || "SmartPOS",
            storeAddress: printBranch?.address,
            storePhone: printBranch?.phone,
            code: invoice.code,
            date: invoice.completedAt ?? new Date().toISOString(),
            cashierName: username,
            customerName: tab.customer?.name,
            customerPhone: tab.customer?.phone,
            items,
            subTotal: tab.items.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0),
            discountAmount: tab.discountAmount,
            totalAmount: total,
            payments: [],
          };
          resetTab(tab.id);
          if (autoPrint) {
            printReceipt(receipt);
            toast({ title: "Đã ra hóa đơn", description: "Đã in hóa đơn tự động", variant: "success" });
          } else {
            setReceiptData(receipt);
            setReceiptOpen(true);
          }
        },
      },
    );
  }

  const total = Math.max(0, tab.items.reduce((sum, item) => sum + getLineTotal(item), 0) - tab.discountAmount);

  function handleOpenDeposit() {
    if (tab.items.length === 0) return;
    if (!tab.customer) {
      toast({ title: "Chọn khách hàng trước khi đặt cọc", description: "Nhấn F4 để tìm khách hàng", variant: "destructive" });
      return;
    }
    setDepositOpen(true);
  }

  function handleConfirmDeposit(input: { depositAmount: number; prescription: string; note: string }) {
    if (!activeBranchId || !tab.customer) return;
    createPreorder.mutate(
      {
        branchId: activeBranchId,
        customerId: tab.customer.id,
        items: tab.items.map((line) => ({
          productId: line.productId,
          quantity: line.quantity,
          // the price the customer actually agreed to (line discount included) is locked into the order
          unitPrice: line.quantity > 0 ? getLineTotal(line) / line.quantity : line.unitPrice,
        })),
        depositAmount: input.depositAmount,
        prescription: input.prescription || null,
        note: input.note || null,
      },
      {
        onSuccess: () => {
          setDepositOpen(false);
          resetTab(tab.id);
        },
      },
    );
  }

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  return (
    <div className="flex h-full flex-col">
      {/* Same navigation as the back-office sidebar, slid over the POS; only shows pages this account may open. */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 flex" onClick={() => setMenuOpen(false)}>
          <div className="h-full shadow-xl" onClick={(e) => (e.target as HTMLElement).closest("a") && setMenuOpen(false)}>
            <Sidebar />
          </div>
          <div className="flex-1 bg-black/40" />
        </div>
      )}
      <div className="flex h-14 shrink-0 items-center gap-2 bg-primary px-2">
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-primary-foreground/80 hover:bg-white/10 hover:text-primary-foreground"
          title="Menu"
        >
          <LayoutGrid className="h-5 w-5" />
        </button>
        <ProductQuickSearch ref={productSearchRef} className="max-w-xs" />
        <InvoiceTabsBar />
        <div className="flex shrink-0 items-center gap-1.5">
          <div className="relative">
            <button
              type="button"
              title="Thiết lập in"
              onClick={() => setPrintSettingsOpen((v) => !v)}
              className="relative flex h-9 w-9 items-center justify-center rounded-md text-primary-foreground/80 hover:bg-white/10 hover:text-primary-foreground"
            >
              <Printer className="h-5 w-5" />
              {autoPrint && (
                <span
                  className={cn(
                    "absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground",
                  )}
                >
                  A
                </span>
              )}
            </button>
            <PrintSettingsPopover open={printSettingsOpen} onOpenChange={setPrintSettingsOpen} />
          </div>
          <UserMenu className="text-primary-foreground hover:bg-white/10 hover:text-primary-foreground" />
        </div>
      </div>
      <div className="flex flex-1 overflow-hidden">
        <CartPanel key={tab.id} tab={tab} />
        <ProductGridPanel
          customer={tab.customer}
          tabId={tab.id}
          customerInputRef={customerSearchRef}
          onRequestQuickAddCustomer={() => setQuickAddOpen(true)}
          onRequestCheckout={handleOpenCheckout}
          onRequestDeposit={handleOpenDeposit}
          checkoutDisabled={tab.items.length === 0}
        />
      </div>

      <DepositDialog
        open={depositOpen}
        onOpenChange={setDepositOpen}
        customerName={tab.customer?.name}
        totalAmount={total}
        isSubmitting={createPreorder.isPending}
        onConfirm={handleConfirmDeposit}
      />

      <CustomerFormDialog
        open={quickAddOpen}
        onOpenChange={setQuickAddOpen}
        onCreated={(customer: CustomerSummary) => setCustomer(tab.id, customer)}
      />

      <PrintReceiptDialog
        open={receiptOpen}
        onOpenChange={setReceiptOpen}
        data={receiptData}
        title="Thanh toán thành công"
        description="In hóa đơn cho khách. Chọn khổ giấy/máy in trong hộp thoại in."
      />
    </div>
  );
}
