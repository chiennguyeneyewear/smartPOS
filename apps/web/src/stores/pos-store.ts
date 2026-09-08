import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  SALE_MODE,
  computeLineUnitDiscount,
  computeLineSellPrice,
  computeLineTotal,
  type ProductSummary,
  type SaleMode,
  type CustomerSummary,
  type LineDiscountType,
} from "@smartpos/shared";

export type { LineDiscountType };

export interface CartLine {
  lineId: string;
  productId: string;
  name: string;
  imageUrl: string | null;
  unitPrice: number;
  quantity: number;
  discountType: LineDiscountType;
  discountValue: number;
}

// Discount is entered either as a flat VND amount or a percentage of unitPrice,
// matching the KiotViet-style per-line discount popover. The actual math lives
// in packages/shared so the backend computes the exact same numbers.
export function getLineUnitDiscount(line: CartLine): number {
  return computeLineUnitDiscount(line.unitPrice, line.discountType, line.discountValue);
}

export function getLineSellPrice(line: CartLine): number {
  return computeLineSellPrice(line.unitPrice, line.discountType, line.discountValue);
}

export function getLineTotal(line: CartLine): number {
  return computeLineTotal(line.unitPrice, line.quantity, line.discountType, line.discountValue);
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
  setLineDiscount: (tabId: string, lineId: string, discountType: LineDiscountType, discountValue: number) => void;
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
              discountType: "AMOUNT",
              discountValue: 0,
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

      setLineDiscount: (tabId, lineId, discountType, discountValue) =>
        set((state) => ({
          tabs: state.tabs.map((tab) =>
            tab.id !== tabId
              ? tab
              : {
                  ...tab,
                  items: tab.items.map((line) =>
                    line.lineId === lineId ? { ...line, discountType, discountValue } : line,
                  ),
                },
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
      // v0 -> v1: CartLine's flat `discount` number was split into
      // `discountType`/`discountValue`. Without this, a cart persisted before
      // that change would rehydrate with `discountType: undefined` and every
      // total downstream would compute to NaN.
      version: 1,
      migrate: (persistedState, version) => {
        const state = persistedState as { tabs?: Array<{ items?: Array<Record<string, unknown>> }> };
        if (version < 1 && state?.tabs) {
          for (const tab of state.tabs) {
            tab.items = tab.items?.map((line) =>
              "discountType" in line
                ? line
                : { ...line, discountType: "AMOUNT" as const, discountValue: Number(line.discount ?? 0) },
            );
          }
        }
        return state as unknown as PosState;
      },
    },
  ),
);

export function getActiveTab(): PosTab {
  const state = usePosStore.getState();
  return state.tabs.find((t) => t.id === state.activeTabId) ?? state.tabs[0]!;
}
