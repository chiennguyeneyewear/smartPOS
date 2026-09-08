import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ColumnDef } from "@tanstack/react-table";
import { customerSchema, type CustomerInput } from "@smartpos/shared";
import type { InvoiceListItem } from "@/features/sales/api";
import { useInvoices } from "@/features/sales/hooks";
import { useCustomer, useUpdateCustomer } from "@/features/customers/hooks";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DataTable } from "@/components/shared/data-table";
import { CustomerForm } from "@/components/shared/customer-form";
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

function CustomerInfoForm({ customerId }: { customerId: string }) {
  const { data: customer } = useCustomer(customerId);
  const updateCustomer = useUpdateCustomer();

  const form = useForm<CustomerInput>({ resolver: zodResolver(customerSchema) });

  useEffect(() => {
    if (!customer) return;
    form.reset({
      name: customer.name,
      name2: customer.name2,
      phone: customer.phone ?? "",
      phone2: customer.phone2,
      address: customer.address,
      province: customer.province,
      ward: customer.ward,
      groupName: customer.groupName,
      birthday: customer.birthday ? customer.birthday.slice(0, 10) : null,
      gender: customer.gender,
      email: customer.email,
      facebook: customer.facebook,
      note: customer.note,
      avatarUrl: customer.avatarUrl,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer?.id]);

  if (!customer) return null;

  function onSubmit() {
    form.handleSubmit((values) => {
      updateCustomer.mutate({ id: customerId, input: values });
    })();
  }

  return (
    <CustomerForm
      form={form}
      code={customer.code}
      onSubmit={onSubmit}
      onCancel={() => form.reset()}
      submitting={updateCustomer.isPending}
    />
  );
}

export function CustomerDetailTabs({ customerId }: { customerId: string }) {
  const { data: invoices, isLoading: invoicesLoading } = useInvoices({ customerId });

  return (
    <Tabs defaultValue="info">
      <TabsList>
        <TabsTrigger value="info">Thông tin</TabsTrigger>
        <TabsTrigger value="history">Lịch sử mua hàng</TabsTrigger>
      </TabsList>

      <TabsContent value="info" className="pt-2">
        <CustomerInfoForm customerId={customerId} />
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
