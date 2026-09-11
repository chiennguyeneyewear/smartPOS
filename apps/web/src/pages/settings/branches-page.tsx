import { useState } from "react";
import { useForm } from "react-hook-form";
import { Pencil, Plus } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import type { BranchSummary } from "@smartpos/shared";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useBranches, useCreateBranch, useUpdateBranch } from "@/features/branches/hooks";

interface FormValues {
  name: string;
  code: string;
  address: string;
  phone: string;
}

function emptyForm(): FormValues {
  return { name: "", code: "", address: "", phone: "" };
}

export function BranchesPage() {
  const [open, setOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<BranchSummary | null>(null);
  const [isActive, setIsActive] = useState(true);

  const { data: branches, isLoading } = useBranches();
  const createBranch = useCreateBranch();
  const updateBranch = useUpdateBranch();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ defaultValues: emptyForm() });

  const isEditing = !!editingBranch;

  function openCreateDialog() {
    setEditingBranch(null);
    reset(emptyForm());
    setIsActive(true);
    setOpen(true);
  }

  function openEditDialog(branch: BranchSummary) {
    setEditingBranch(branch);
    reset({ name: branch.name, code: branch.code, address: branch.address ?? "", phone: branch.phone ?? "" });
    setIsActive(branch.isActive);
    setOpen(true);
  }

  const onSubmit = handleSubmit((values) => {
    if (editingBranch) {
      updateBranch.mutate(
        { id: editingBranch.id, input: { name: values.name, address: values.address, phone: values.phone, isActive } },
        { onSuccess: () => setOpen(false) },
      );
      return;
    }
    createBranch.mutate(values, { onSuccess: () => setOpen(false) });
  });

  const columns: ColumnDef<BranchSummary, any>[] = [
    { accessorKey: "name", header: "Tên chi nhánh", cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
    { accessorKey: "code", header: "Mã chi nhánh" },
    { accessorKey: "address", header: "Địa chỉ (in trên hóa đơn)", cell: ({ getValue }) => getValue() || "Chưa có" },
    { accessorKey: "phone", header: "Điện thoại (in trên hóa đơn)", cell: ({ getValue }) => getValue() || "Chưa có" },
    {
      accessorKey: "isActive",
      header: "Trạng thái",
      cell: ({ getValue }) => (getValue() ? <Badge variant="success">Hoạt động</Badge> : <Badge variant="secondary">Ngừng hoạt động</Badge>),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => openEditDialog(row.original)}>
          <Pencil className="h-3.5 w-3.5" /> Sửa
        </Button>
      ),
    },
  ];

  const isPending = createBranch.isPending || updateBranch.isPending;

  return (
    <div>
      <PageHeader
        title="Cửa hàng"
        description="Thông tin chi nhánh hiển thị trên hóa đơn in"
        actions={
          <Button onClick={openCreateDialog} className="gap-1.5">
            <Plus className="h-4 w-4" /> Thêm chi nhánh
          </Button>
        }
      />

      <DataTable columns={columns} data={branches ?? []} isLoading={isLoading} emptyMessage="Chưa có chi nhánh" />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEditing ? `Sửa thông tin — ${editingBranch?.name}` : "Thêm chi nhánh"}</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-1.5">
              <Label>Tên chi nhánh</Label>
              <Input {...register("name", { required: true })} />
              {errors.name && <p className="text-xs text-destructive">Bắt buộc</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Mã chi nhánh</Label>
              <Input {...register("code", { required: true })} disabled={isEditing} />
              {errors.code && <p className="text-xs text-destructive">Bắt buộc</p>}
              {isEditing && <p className="text-xs text-muted-foreground">Không thể đổi mã chi nhánh</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Địa chỉ (in trên hóa đơn)</Label>
              <Input {...register("address")} placeholder="VD: 123 Nguyễn Văn A, Q.1, TP.HCM" />
            </div>
            <div className="space-y-1.5">
              <Label>Số điện thoại (in trên hóa đơn)</Label>
              <Input {...register("phone")} placeholder="VD: 0901 234 567" />
            </div>
            {isEditing && (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
                Chi nhánh đang hoạt động
              </label>
            )}
            <DialogFooter>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Đang lưu..." : "Lưu chi nhánh"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
