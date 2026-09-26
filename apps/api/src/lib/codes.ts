import { prisma } from "./prisma.js";

// Derives the next code from the highest existing code's numeric suffix
// (not a row count) so deleted/cancelled rows can never leave a gap that
// collides with a still-existing higher-numbered code.
function nextSequentialCode(prefix: string, currentMax: string | null): string {
  const currentNumber = currentMax ? Number(currentMax.slice(prefix.length)) : 0;
  return `${prefix}${String(currentNumber + 1).padStart(6, "0")}`;
}

export async function generateCustomerCode() {
  const last = await prisma.customer.findFirst({
    where: { code: { startsWith: "KH" } },
    orderBy: { code: "desc" },
    select: { code: true },
  });
  return nextSequentialCode("KH", last?.code ?? null);
}

export async function generateSupplierCode() {
  const last = await prisma.supplier.findFirst({
    where: { code: { startsWith: "NCC" } },
    orderBy: { code: "desc" },
    select: { code: true },
  });
  return nextSequentialCode("NCC", last?.code ?? null);
}

export async function generatePreorderCode() {
  const last = await prisma.preorder.findFirst({
    where: { code: { startsWith: "DH" } },
    orderBy: { code: "desc" },
    select: { code: true },
  });
  return nextSequentialCode("DH", last?.code ?? null);
}

export async function generateInvoiceCode() {
  const last = await prisma.invoice.findFirst({
    where: { code: { startsWith: "HD" } },
    orderBy: { code: "desc" },
    select: { code: true },
  });
  return nextSequentialCode("HD", last?.code ?? null);
}

// Next auto product code (SP000123). Takes the highest purely numeric SP-code, ignoring imported
// codes that don't follow the pattern, so a stray code can't break the sequence.
export async function generateProductCode() {
  const rows = await prisma.$queryRaw<{ max: number | null }[]>`
    SELECT MAX(CAST(SUBSTRING(sku FROM 3) AS INTEGER)) AS max FROM products WHERE sku ~ '^SP[0-9]{1,9}$'
  `;
  return `SP${String((rows[0]?.max ?? 0) + 1).padStart(6, "0")}`;
}
