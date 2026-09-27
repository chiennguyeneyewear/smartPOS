import type {
  CheckoutInvoiceInput,
  ConfirmPaymentInput,
  InvoiceSummary,
  PaymentMethod,
  SaveInvoiceInput,
} from "@smartpos/shared";
import { apiClient } from "@/lib/api-client";

export async function createDraftInvoice(input: SaveInvoiceInput): Promise<InvoiceSummary> {
  const { data } = await apiClient.post<InvoiceSummary>("/sales/invoices", input);
  return data;
}

export async function updateDraftInvoice(id: string, input: SaveInvoiceInput): Promise<InvoiceSummary> {
  const { data } = await apiClient.patch<InvoiceSummary>(`/sales/invoices/${id}`, input);
  return data;
}

export async function checkoutInvoice(id: string, input: CheckoutInvoiceInput): Promise<InvoiceSummary> {
  const { data } = await apiClient.post<InvoiceSummary>(`/sales/invoices/${id}/checkout`, input);
  return data;
}

export async function confirmInvoicePayment(id: string, input: ConfirmPaymentInput): Promise<InvoiceSummary> {
  const { data } = await apiClient.post<InvoiceSummary>(`/sales/invoices/${id}/confirm-payment`, input);
  return data;
}

export async function addInvoicePayment(id: string, input: ConfirmPaymentInput): Promise<InvoiceSummary> {
  const { data } = await apiClient.post<InvoiceSummary>(`/sales/invoices/${id}/add-payment`, input);
  return data;
}

export interface DayPayment {
  id: string;
  paidAt: string;
  invoiceCode: string;
  customerName: string;
  method: PaymentMethod;
  amount: number;
  reference: string | null;
  kind: "Bán hàng" | "Cọc" | "Thu nốt";
  remainingAfter: number;
  firstPaidAt: string;
  sellerName: string;
}

export interface DayPayments {
  date: string;
  salesTotal: number;
  payments: DayPayment[];
  pending: { invoiceCode: string; customerName: string; amount: number }[];
}

export async function fetchPaymentsOnDay(params: { date: string; sellerId?: string }): Promise<DayPayments> {
  const { data } = await apiClient.get<DayPayments>("/sales/payments", { params });
  return data;
}

export async function voidInvoice(id: string): Promise<InvoiceSummary> {
  const { data } = await apiClient.post<InvoiceSummary>(`/sales/invoices/${id}/void`);
  return data;
}

export interface InvoiceListItem extends Omit<InvoiceSummary, "items"> {
  items: {
    productId: string;
    quantity: number;
    unitPrice: number;
    discount: number;
    lineTotal: number;
    product: { name: string; sku: string };
  }[];
  payments: { method: PaymentMethod; amount: number; reference?: string | null; createdAt?: string }[];
  paymentLogs: {
    id: string;
    username: string;
    action: string;
    before: { paymentStatus?: string; payments?: { method: PaymentMethod; amount: number }[] };
    after: { paymentStatus?: string; payments?: { method: PaymentMethod; amount: number }[] };
    createdAt: string;
  }[];
  preorder: { code: string; depositMethod: PaymentMethod | null } | null;
  createdById: string;
  createdByName: string;
  customer: { code: string; name: string; phone: string | null; note: string | null } | null;
}

export async function fetchInvoices(params: {
  branchId?: string;
  status?: string;
  customerId?: string;
  createdById?: string;
  paymentStatus?: string;
  from?: string;
  to?: string;
}): Promise<InvoiceListItem[]> {
  const { data } = await apiClient.get<{ data: InvoiceListItem[] }>("/sales/invoices", { params });
  return data.data;
}

export async function voidInvoices(ids: string[]): Promise<void> {
  await apiClient.post("/sales/invoices/void-bulk", { ids });
}
