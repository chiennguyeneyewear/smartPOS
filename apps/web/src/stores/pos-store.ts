import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { SALE_MODE, type ProductSummary, type SaleMode, type CustomerSummary } from "@smartpos/shared";

export interface CartLine {
  lineId: string;
  productId: string;
  name: string;
  imageUrl: string | null;
  unitPrice: number;
  quantity: number;
  discount: number;
}

export interface PosTab {
  id: string;
  invoiceId?: string;
  label: string;
  saleMode: SaleMode;
  customer?: CustomerSummary;
  items: CartLine[];
  note: string;
  discountAmount: number;
}

function createEmptyTab(index: number): PosTab {
  return {
    id: crypto.randomUUID(),
    label: `Hóa đơn ${index}`,
    saleMode: SALE_MODE.NORMAL,
    items: [],
    note: "",
    discountAmount: 0,
  };
}

interface PosState {
  tabs: PosTab[];
  activeTabId: string;
  addTab: () => void;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  addItem: (product: ProductSummary) => void;
  updateQuantity: (tabId: string, lineId: string, quantity: number) => void;
  updateLinePrice: (tabId: string, lineId: string, unitPrice: number) => void;
  removeItem: (tabId: string, lineId: string) => void;
  setCustomer: (tabId: string, customer: CustomerSummary | undefined) => void;
  setNote: (tabId: string, note: string) => void;
  setSaleMode: (tabId: string, mode: SaleMode) => void;
  setDiscount: (tabId: string, amount: number) => void;
  resetTab: (tabId: string) => void;
}

const initialTab = createEmptyTab(1);

export const usePosStore = create<PosState>()(
  persist(
    (set, get) => ({
      tabs: [initialTab],
      activeTabId: initialTab.id,

      addTab: () =>
        set((state) => {
          const tab = createEmptyTab(state.tabs.length + 1);
          return { tabs: [...state.tabs, tab], activeTabId: tab.id };
        }),

      closeTab: (tabId) =>
        set((state) => {
          const remaining = state.tabs.filter((t) => t.id !== tabId);
          if (remaining.length === 0) {
            const fresh = createEmptyTab(1);
            return { tabs: [fresh], activeTabId: fresh.id };
          }
          const activeTabId = state.activeTabId === tabId ? remaining[0]!.id : state.activeTabId;
          return { tabs: remaining, activeTabId };
        }),

      setActiveTab: (activeTabId) => set({ activeTabId }),

      addItem: (product) =>
        set((state) => ({
          tabs: state.tabs.map((tab) => {
            if (tab.id !== state.activeTabId) return tab;
            const existing = tab.items.find((line) => line.productId === product.id);
            if (existing) {
              return {
                ...tab,
                items: tab.items.map((line) =>
                  line.productId === product.id ? { ...line, quantity: line.quantity + 1 } : line,
                ),
              };
            }
            const newLine: CartLine = {
              lineId: crypto.randomUUID(),
              productId: product.id,
              name: product.name,
              imageUrl: product.imageUrl,
              unitPrice: product.sellPrice,
              quantity: 1,
              discount: 0,
            };
            return { ...tab, items: [...tab.items, newLine] };
          }),
        })),

      updateQuantity: (tabId, lineId, quantity) =>
        set((state) => ({
          tabs: state.tabs.map((tab) =>
            tab.id !== tabId
              ? tab
              : {
                  ...tab,
                  items: tab.items
                    .map((line) => (line.lineId === lineId ? { ...line, quantity: Math.max(0, quantity) } : line))
                    .filter((line) => line.quantity > 0),
                },
          ),
        })),

      updateLinePrice: (tabId, lineId, unitPrice) =>
        set((state) => ({
          tabs: state.tabs.map((tab) =>
            tab.id !== tabId
              ? tab
              : { ...tab, items: tab.items.map((line) => (line.lineId === lineId ? { ...line, unitPrice } : line)) },
          ),
        })),

      removeItem: (tabId, lineId) =>
        set((state) => ({
          tabs: state.tabs.map((tab) =>
            tab.id !== tabId ? tab : { ...tab, items: tab.items.filter((line) => line.lineId !== lineId) },
          ),
        })),

      setCustomer: (tabId, customer) =>
        set((state) => ({
          tabs: state.tabs.map((tab) => (tab.id !== tabId ? tab : { ...tab, customer })),
        })),

      setNote: (tabId, note) =>
        set((state) => ({ tabs: state.tabs.map((tab) => (tab.id !== tabId ? tab : { ...tab, note })) })),

      setSaleMode: (tabId, saleMode) =>
        set((state) => ({ tabs: state.tabs.map((tab) => (tab.id !== tabId ? tab : { ...tab, saleMode })) })),

      setDiscount: (tabId, discountAmount) =>
        set((state) => ({
          tabs: state.tabs.map((tab) => (tab.id !== tabId ? tab : { ...tab, discountAmount })),
        })),

      resetTab: (tabId) =>
        set((state) => ({
          tabs: state.tabs.map((tab) =>
            tab.id !== tabId ? tab : { ...createEmptyTab(1), id: tab.id, label: tab.label },
          ),
        })),
    }),
    {
      name: "smartpos-pos-cart",
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
);

export function getActiveTab(): PosTab {
  const state = usePosStore.getState();
  return state.tabs.find((t) => t.id === state.activeTabId) ?? state.tabs[0]!;
}
