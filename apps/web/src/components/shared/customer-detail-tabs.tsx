import type { ColumnDef } from "@tanstack/react-table";
import type { InvoiceListItem } from "@/features/sales/api";
import { useInvoices } from "@/features/sales/hooks";
import { useCustomer } from "@/features/customers/hooks";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DataTable } from "@/components/shared/data-table";
import { formatCurrency, formatDateTime } from "@/lib/utils";

const historyColumns: ColumnDef<InvoiceListItem, any>[] = [
  { accessorKey: "code", header: "Mã hóa đơn" },
  {
    id: "createdAt",
    header: "Thời gian",
    cell: ({ row }) => formatDateTime(row.original.createdAt),
  },
  { accessorKey: "createdByName", header: "Người bán" },
  {
    id: "totalAmount",
    header: "Tổng cộng",
    cell: ({ row }) => <span className="font-medium">{formatCurrency(row.original.totalAmount)}</span>,
  },
  {
    id: "status",
    header: "Trạng thái",
    cell: ({ row }) =>
      row.original.status === "CANCELLED" ? (
        <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
          Đã hủy
        </span>
      ) : (
        <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
          Hoàn thành
        </span>
      ),
  },
];

export function CustomerDetailTabs({ customerId }: { customerId: string }) {
  const { data: customer } = useCustomer(customerId);
  const { data: invoices, isLoading: invoicesLoading } = useInvoices({ customerId });

  return (
    <Tabs defaultValue="info">
      <TabsList>
        <TabsTrigger value="info">Thông tin</TabsTrigger>
        <TabsTrigger value="history">Lịch sử mua hàng</TabsTrigger>
      </TabsList>

      <TabsContent value="info">
        <div className="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground">Họ tên</p>
            <p className="text-sm font-medium">{customer?.name ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Số điện thoại</p>
            <p className="text-sm font-medium">{customer?.phone ?? "Chưa có"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Người tạo</p>
            <p className="text-sm font-medium">{customer?.createdByName ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Ngày tạo</p>
            <p className="text-sm font-medium">
              {customer?.createdAt ? formatDateTime(customer.createdAt) : "—"}
            </p>
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <p className="text-xs text-muted-foreground">Ghi chú</p>
            <p className="text-sm font-medium">{customer?.note ?? "Chưa có"}</p>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="history">
        <div className="pt-2">
          <DataTable
            columns={historyColumns}
            data={invoices ?? []}
            isLoading={invoicesLoading}
            emptyMessage="Khách hàng chưa có hóa đơn nào"
          />
        </div>
      </TabsContent>
    </Tabs>
  );
}
