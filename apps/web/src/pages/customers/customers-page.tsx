import { useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus, Search } from "lucide-react";
import type { CustomerSummary } from "@smartpos/shared";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { CustomerFormDialog } from "@/components/shared/customer-form-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { useCustomerList, useCustomer } from "@/features/customers/hooks";
import { useInvoices } from "@/features/sales/hooks";
import type { InvoiceListItem } from "@/features/sales/api";

const columns: ColumnDef<CustomerSummary, any>[] = [
  { accessorKey: "code", header: "Mã KH" },
  { accessorKey: "name", header: "Tên khách hàng", cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
  { accessorKey: "phone", header: "Điện thoại" },
  { accessorKey: "address", header: "Địa chỉ" },
  { accessorKey: "groupName", header: "Nhóm" },
  {
    accessorKey: "debtBalance",
    header: "Công nợ",
    cell: ({ getValue }) => {
      const value = getValue() as number;
      return value > 0 ? <Badge variant="destructive">{formatCurrency(value)}</Badge> : formatCurrency(value);
    },
  },
];

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

function CustomerDetailPanel({ customerId }: { customerId: string }) {
  const { data: customer } = useCustomer(customerId);
  const { data: invoices, isLoading: invoicesLoading } = useInvoices({ customerId });

  return (
    <Card>
      <CardContent className="pt-4">
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
      </CardContent>
    </Card>
  );
}

export function CustomersPage() {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const { data, isLoading } = useCustomerList(search);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Khách hàng"
        description="Quản lý danh sách khách hàng &amp; công nợ"
        actions={
          <Button onClick={() => setOpen(true)} className="gap-1.5">
            <Plus className="h-4 w-4" /> Thêm khách hàng
          </Button>
        }
      />
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm theo tên, SĐT..." className="pl-8" />
      </div>
      <DataTable
        columns={columns}
        data={data ?? []}
        isLoading={isLoading}
        emptyMessage="Chưa có khách hàng"
        onRowClick={(row) => setSelectedCustomerId(row.id === selectedCustomerId ? null : row.id)}
        isRowSelected={(row) => row.id === selectedCustomerId}
      />

      {selectedCustomerId && <CustomerDetailPanel customerId={selectedCustomerId} />}

      <CustomerFormDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}
