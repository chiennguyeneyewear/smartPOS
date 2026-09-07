import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus, Search } from "lucide-react";
import { customerSchema, type CustomerInput, type CustomerSummary } from "@smartpos/shared";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils";
import { useCreateCustomer, useCustomerList } from "@/features/customers/hooks";

const columns: ColumnDef<CustomerSummary, any>[] = [
  { accessorKey: "code", header: "Mã KH" },
  { accessorKey: "name", header: "Tên khách hàng", cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
  { accessorKey: "phone", header: "Điện thoại" },
  { accessorKey: "address", header: "Địa chỉ" },
  {
    accessorKey: "debtBalance",
    header: "Công nợ",
    cell: ({ getValue }) => {
      const value = getValue() as number;
      return value > 0 ? <Badge variant="destructive">{formatCurrency(value)}</Badge> : formatCurrency(value);
    },
  },
];

export function CustomersPage() {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useCustomerList(search);
  const createCustomer = useCreateCustomer();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CustomerInput>({ resolver: zodResolver(customerSchema) });

  const onSubmit = handleSubmit((values) => {
    createCustomer.mutate(values, {
      onSuccess: () => {
        reset();
        setOpen(false);
      },
    });
  });

  return (
    <div>
      <PageHeader
        title="Khách hàng"
        description="Quản lý danh sách khách hàng &amp; công nợ"
        actions={
          <Button onClick={() => setOpen(true)} className="gap-1.5">
            <Plus className="h-4 w-4" /> Thêm khách hàng
          </Button>
        }
      />
      <div className="relative mb-3 max-w-sm">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm theo tên, SĐT..." className="pl-8" />
      </div>
      <DataTable columns={columns} data={data ?? []} isLoading={isLoading} emptyMessage="Chưa có khách hàng" />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thêm khách hàng</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-1.5">
              <Label>Tên khách hàng</Label>
              <Input {...register("name")} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Số điện thoại</Label>
              <Input {...register("phone")} />
            </div>
            <div className="space-y-1.5">
              <Label>Địa chỉ</Label>
              <Input {...register("address")} />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={createCustomer.isPending}>
                {createCustomer.isPending ? "Đang lưu..." : "Lưu khách hàng"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
