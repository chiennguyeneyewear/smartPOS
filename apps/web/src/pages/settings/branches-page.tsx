import { useState } from "react";
import { useForm } from "react-hook-form";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import type { BranchSummary } from "@smartpos/shared";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useBranches, useCreateBranch } from "@/features/branches/hooks";
import type { CreateBranchInput } from "@/features/branches/api";

const columns: ColumnDef<BranchSummary, any>[] = [
  { accessorKey: "code", header: "Mã CN" },
  { accessorKey: "name", header: "Tên chi nhánh", cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
];

export function BranchesPage() {
  const [open, setOpen] = useState(false);
  const { data: branches, isLoading } = useBranches();
  const createBranch = useCreateBranch();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateBranchInput>();

  const onSubmit = handleSubmit((values) => {
    createBranch.mutate(values, {
      onSuccess: () => {
        reset();
        setOpen(false);
      },
    });
  });

  return (
    <div>
      <PageHeader
        title="Chi nhánh"
        description="Quản lý các chi nhánh kinh doanh"
        actions={
          <Button onClick={() => setOpen(true)} className="gap-1.5">
            <Plus className="h-4 w-4" /> Thêm chi nhánh
          </Button>
        }
      />
      <DataTable columns={columns} data={branches ?? []} isLoading={isLoading} emptyMessage="Chưa có chi nhánh" />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thêm chi nhánh</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-1.5">
              <Label>Mã chi nhánh</Label>
              <Input {...register("code", { required: true })} />
              {errors.code && <p className="text-xs text-destructive">Bắt buộc</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Tên chi nhánh</Label>
              <Input {...register("name", { required: true })} />
              {errors.name && <p className="text-xs text-destructive">Bắt buộc</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Địa chỉ</Label>
              <Input {...register("address")} />
            </div>
            <div className="space-y-1.5">
              <Label>Số điện thoại</Label>
              <Input {...register("phone")} />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={createBranch.isPending}>
                {createBranch.isPending ? "Đang lưu..." : "Lưu chi nhánh"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
