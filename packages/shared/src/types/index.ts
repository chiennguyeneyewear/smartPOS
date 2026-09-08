import type { Gender, InvoiceStatus, PaymentMethod, SaleMode, StockMovementType } from "../constants/enums.js";

export interface PageMeta {
  total: number;
  page: number;
  pageSize: number;
}

export interface PagedResult<T> {
  data: T[];
  meta: PageMeta;
}

export interface BranchSummary {
  id: string;
  name: string;
  code: string;
}

export interface UnitSummary {
  id: string;
  name: string;
}

export interface CategorySummary {
  id: string;
  name: string;
  parentId: string | null;
}

export interface ProductSummary {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  imageUrl: string | null;
  categoryId: string | null;
  unitId: string;
  unit: UnitSummary;
  costPrice: number;
  sellPrice: number;
  isActive: boolean;
}

export interface StockItemSummary {
  productId: string;
  branchId: string;
  quantity: number;
}

export interface CustomerSummary {
  id: string;
  code: string;
  name: string;
  phone: string | null;
  address: string | null;
  province: string | null;
  ward: string | null;
  groupName: string | null;
  birthday: string | null;
  gender: Gender | null;
  email: string | null;
  facebook: string | null;
  note: string | null;
  avatarUrl: string | null;
  debtBalance: number;
  createdAt: string;
}

export interface SupplierSummary {
  id: string;
  code: string;
  name: string;
  phone: string | null;
  address: string | null;
  debtBalance: number;
}

export interface InvoiceItemSummary {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  lineTotal: number;
}

export interface InvoiceSummary {
  id: string;
  code: string;
  branchId: string;
  customerId: string | null;
  saleMode: SaleMode;
  status: InvoiceStatus;
  note: string | null;
  subTotal: number;
  discountAmount: number;
  totalAmount: number;
  paidAmount: number;
  items: InvoiceItemSummary[];
  createdAt: string;
  completedAt: string | null;
}

export interface PaymentSummary {
  id: string;
  invoiceId: string;
  method: PaymentMethod;
  amount: number;
  createdAt: string;
}

export interface StockMovementSummary {
  id: string;
  type: StockMovementType;
  branchId: string;
  fromBranchId: string | null;
  toBranchId: string | null;
  supplierId: string | null;
  note: string | null;
  createdAt: string;
}

export interface CurrentUser {
  id: string;
  username: string;
  email: string | null;
  role: string;
  permissions: string[];
  menuAccess: string[];
  branches: BranchSummary[];
  defaultBranchId: string | null;
}
