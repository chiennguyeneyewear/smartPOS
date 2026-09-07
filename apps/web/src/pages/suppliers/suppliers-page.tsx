import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus, Search } from "lucide-react";
import { supplierSchema, type SupplierInput, type SupplierSummary } from "@smartpos/shared";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils";
import { useCreateSupplier, useSuppliers } from "@/features/suppliers/hooks";

const columns: ColumnDef<SupplierSummary, any>[] = [
  { accessorKey: "code", header: "Mã NCC" },
  { accessorKey: "name", header: "Tên nhà cung cấp", cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
  { accessorKey: "phone", header: "Điện thoại" },
  { accessorKey: "address", header: "Địa chỉ" },
  {
    accessorKey: "debtBalance",
    header: "Công nợ phải trả",
    cell: ({ getValue }) => {
      const value = getValue() as number;
      return value > 0 ? <Badge variant="destructive">{formatCurrency(value)}</Badge> : formatCurrency(value);
    },
  },
];

export function SuppliersPage() {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useSuppliers(search);
  const createSupplier = useCreateSupplier();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SupplierInput>({ resolver: zodResolver(supplierSchema) });

  const onSubmit = handleSubmit((values) => {
    createSupplier.mutate(values, {
      onSuccess: () => {
        reset();
        setOpen(false);
      },
    });
  });

  return (
    <div>
      <PageHeader
        title="Nhà cung cấp"
        description="Quản lý danh sách nhà cung cấp &amp; công nợ phải trả"
        actions={
          <Button onClick={() => setOpen(true)} className="gap-1.5">
            <Plus className="h-4 w-4" /> Thêm nhà cung cấp
          </Button>
        }
      />
      <div className="relative mb-3 max-w-sm">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm theo tên..." className="pl-8" />
      </div>
      <DataTable columns={columns} data={data ?? []} isLoading={isLoading} emptyMessage="Chưa có nhà cung cấp" />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thêm nhà cung cấp</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-1.5">
              <Label>Tên nhà cung cấp</Label>
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
              <Button type="submit" disabled={createSupplier.isPending}>
                {createSupplier.isPending ? "Đang lưu..." : "Lưu nhà cung cấp"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
