import type { CheckoutInvoiceInput, InvoiceSummary, PaymentMethod, SaveInvoiceInput } from "@smartpos/shared";
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
  payments: { method: PaymentMethod; amount: number }[];
  createdByName: string;
  customer: { code: string; name: string; phone: string | null } | null;
}

export async function fetchInvoices(params: {
  branchId?: string;
  status?: string;
  customerId?: string;
  createdById?: string;
  from?: string;
  to?: string;
}): Promise<InvoiceListItem[]> {
  const { data } = await apiClient.get<{ data: InvoiceListItem[] }>("/sales/invoices", { params });
  return data.data;
}

export async function voidInvoices(ids: string[]): Promise<void> {
  await apiClient.post("/sales/invoices/void-bulk", { ids });
}
