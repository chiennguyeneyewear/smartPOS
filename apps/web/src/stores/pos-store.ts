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
  sku: string;
  name: string;
  imageUrl: string | null;
  unitPrice: number;
  quantity: number;
  discountType: LineDiscountType;
  discountValue: number;
  // Who sold/advised this specific product — picked per line (a frame and its lenses on the same
  // invoice are often sold by different staff), defaults to the tab's `defaultSellerId` when the line
  // is added and can be overridden per line from there.
  sellerId: string | null;
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
  saleMode: SaleMode;
  customer?: CustomerSummary;
  items: CartLine[];
  note: string;
  discountAmount: number;
  // Who did the eye exam/fitting for this invoice — one pick per whole invoice (a customer's eyes are
  // measured once per visit, however many products they buy).
  fitterId: string | null;
  // The "apply to all" seller shown in the cart's "Thông tin bán hàng" footer: picking a name here fills
  // every current line's `sellerId` with it (see setDefaultSeller) and seeds new lines added afterward.
  // It does not have to match every line — a line can still be overridden individually.
  defaultSellerId: string | null;
}

// Tabs are labeled "Hóa đơn N" by their position in the list (computed where
// displayed, e.g. invoice-tabs-bar.tsx), not a number fixed at creation —
// otherwise closing an earlier tab leaves the survivors permanently
// mislabeled (e.g. "Hóa đơn 4" as the only tab left).
function createEmptyTab(): PosTab {
  return {
    id: crypto.randomUUID(),
    saleMode: SALE_MODE.NORMAL,
    items: [],
    note: "",
    discountAmount: 0,
    fitterId: null,
    defaultSellerId: null,
  };
}

interface PosState {
  tabs: PosTab[];
  activeTabId: string;
  addTab: () => void;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  addItem: (product: ProductSummary) => void;
  duplicateLine: (tabId: string, lineId: string) => void;
  updateQuantity: (tabId: string, lineId: string, quantity: number) => void;
  updateLinePrice: (tabId: string, lineId: string, unitPrice: number) => void;
  setLineDiscount: (tabId: string, lineId: string, discountType: LineDiscountType, discountValue: number) => void;
  setLineSeller: (tabId: string, lineId: string, staffId: string | null) => void;
  setFitter: (tabId: string, staffId: string | null) => void;
  // Sets the tab's "apply to all" default AND overwrites every current line's sellerId with it — a
  // deliberate bulk overwrite (including lines already customized individually), not a merge.
  setDefaultSeller: (tabId: string, staffId: string | null) => void;
  removeItem: (tabId: string, lineId: string) => void;
  setCustomer: (tabId: string, customer: CustomerSummary | undefined) => void;
  setNote: (tabId: string, note: string) => void;
  setSaleMode: (tabId: string, mode: SaleMode) => void;
  setDiscount: (tabId: string, amount: number) => void;
  resetTab: (tabId: string) => void;
}

const initialTab = createEmptyTab();

export const usePosStore = create<PosState>()(
  persist(
    (set, get) => ({
      tabs: [initialTab],
      activeTabId: initialTab.id,

      addTab: () =>
        set((state) => {
          const tab = createEmptyTab();
          return { tabs: [...state.tabs, tab], activeTabId: tab.id };
        }),

      closeTab: (tabId) =>
        set((state) => {
          const remaining = state.tabs.filter((t) => t.id !== tabId);
          if (remaining.length === 0) {
            const fresh = createEmptyTab();
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
              sku: product.sku,
              name: product.name,
              imageUrl: product.imageUrl,
              unitPrice: product.sellPrice,
              quantity: 1,
              discountType: "PERCENT",
              discountValue: 0,
              sellerId: tab.defaultSellerId,
            };
            return { ...tab, items: [...tab.items, newLine] };
          }),
        })),

      // Adds a fresh line for the same product instead of bumping an existing
      // line's quantity — used by the cart row's "+" button, since each unit
      // may need its own price/discount (e.g. per-lens prescriptions).
      duplicateLine: (tabId, lineId) =>
        set((state) => ({
          tabs: state.tabs.map((tab) => {
            if (tab.id !== tabId) return tab;
            const source = tab.items.find((line) => line.lineId === lineId);
            if (!source) return tab;
            const newLine: CartLine = {
              ...source,
              lineId: crypto.randomUUID(),
              quantity: 1,
              discountType: "PERCENT",
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

      setLineSeller: (tabId, lineId, staffId) =>
        set((state) => ({
          tabs: state.tabs.map((tab) =>
            tab.id !== tabId
              ? tab
              : { ...tab, items: tab.items.map((line) => (line.lineId === lineId ? { ...line, sellerId: staffId } : line)) },
          ),
        })),

      setFitter: (tabId, staffId) =>
        set((state) => ({
          tabs: state.tabs.map((tab) => (tab.id !== tabId ? tab : { ...tab, fitterId: staffId })),
        })),

      setDefaultSeller: (tabId, staffId) =>
        set((state) => ({
          tabs: state.tabs.map((tab) =>
            tab.id !== tabId
              ? tab
              : {
                  ...tab,
                  defaultSellerId: staffId,
                  items: tab.items.map((line) => ({ ...line, sellerId: staffId })),
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
            tab.id !== tabId ? tab : { ...createEmptyTab(), id: tab.id },
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
      // v1 -> v2: added `sellerId`/`fitterId` per line; default missing ones to null.
      // v2 -> v3: moved `sellerId`/`fitterId` from per-line to per-invoice (per tab).
      // v3 -> v4: split them back apart — `fitterId` stays per-invoice (one eye exam per visit), but
      // `sellerId` moves back to per-line (a frame and its lenses can be sold by different staff). The
      // old tab-level `sellerId` becomes the new `defaultSellerId` and is copied onto every existing line
      // so a cart mid-checkout doesn't suddenly look unfilled.
      version: 4,
      migrate: (persistedState, version) => {
        const state = persistedState as {
          tabs?: Array<
            Record<string, unknown> & { items?: Array<Record<string, unknown>>; sellerId?: unknown; fitterId?: unknown }
          >;
        };
        if (version < 1 && state?.tabs) {
          for (const tab of state.tabs) {
            tab.items = tab.items?.map((line) =>
              "discountType" in line
                ? line
                : { ...line, discountType: "AMOUNT" as const, discountValue: Number(line.discount ?? 0) },
            );
          }
        }
        if (version < 2 && state?.tabs) {
          for (const tab of state.tabs) {
            tab.items = tab.items?.map((line) => ({
              sellerId: null,
              fitterId: null,
              ...line,
            }));
          }
        }
        if (version < 3 && state?.tabs) {
          for (const tab of state.tabs) {
            tab.items = tab.items?.map((line) => {
              const { sellerId: _seller, fitterId: _fitter, ...rest } = line;
              return rest;
            });
            tab.sellerId = null;
            tab.fitterId = null;
          }
        }
        if (version < 4 && state?.tabs) {
          for (const tab of state.tabs) {
            const oldSellerId = (tab.sellerId as string | null | undefined) ?? null;
            tab.items = tab.items?.map((line) => ({ ...line, sellerId: oldSellerId }));
            tab.defaultSellerId = oldSellerId;
            delete tab.sellerId;
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
