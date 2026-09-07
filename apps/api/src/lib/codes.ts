import { prisma } from "./prisma.js";

async function nextSequentialCode(
  prefix: string,
  count: () => Promise<number>,
): Promise<string> {
  const total = await count();
  return `${prefix}${String(total + 1).padStart(6, "0")}`;
}

export const generateCustomerCode = () =>
  nextSequentialCode("KH", () => prisma.customer.count());

export const generateSupplierCode = () =>
  nextSequentialCode("NCC", () => prisma.supplier.count());

export const generateInvoiceCode = () =>
  nextSequentialCode("HD", () => prisma.invoice.count());
