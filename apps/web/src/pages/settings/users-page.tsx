import { useState } from "react";
import { useForm } from "react-hook-form";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBranches } from "@/features/branches/hooks";
import { useCreateUser, useRoles, useUsers } from "@/features/users/hooks";
import type { CreateUserInput, UserRow } from "@/features/users/api";

const ROLE_LABELS: Record<string, string> = {
  admin: "Quản trị viên",
  manager: "Quản lý",
  cashier: "Thu ngân",
  warehouse: "Thủ kho",
};

const columns: ColumnDef<UserRow, any>[] = [
  { accessorKey: "fullName", header: "Họ tên", cell: ({ row }) => <span className="font-medium">{row.original.fullName}</span> },
  { accessorKey: "email", header: "Email" },
  { accessorKey: "role", header: "Vai trò", cell: ({ getValue }) => <Badge variant="secondary">{ROLE_LABELS[getValue() as string] ?? (getValue() as string)}</Badge> },
  {
    id: "branches",
    header: "Chi nhánh",
    cell: ({ row }) => row.original.branches.map((b) => b.name).join(", "),
  },
  {
    accessorKey: "isActive",
    header: "Trạng thái",
    cell: ({ getValue }) => (getValue() ? <Badge variant="success">Hoạt động</Badge> : <Badge variant="secondary">Đã khóa</Badge>),
  },
];

export function UsersPage() {
  const [open, setOpen] = useState(false);
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const { data: users, isLoading } = useUsers();
  const { data: roles } = useRoles();
  const { data: branches } = useBranches();
  const createUser = useCreateUser();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<CreateUserInput>();

  const onSubmit = handleSubmit((values) => {
    createUser.mutate(
      { ...values, branchIds: selectedBranches },
      {
        onSuccess: () => {
          reset();
          setSelectedBranches([]);
          setOpen(false);
        },
      },
    );
  });

  function toggleBranch(id: string) {
    setSelectedBranches((prev) => (prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]));
  }

  return (
    <div>
      <PageHeader
        title="Nhân viên"
        description="Quản lý tài khoản &amp; phân quyền"
        actions={
          <Button onClick={() => setOpen(true)} className="gap-1.5">
            <Plus className="h-4 w-4" /> Thêm nhân viên
          </Button>
        }
      />
      <DataTable columns={columns} data={users ?? []} isLoading={isLoading} emptyMessage="Chưa có nhân viên" />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thêm nhân viên</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-1.5">
              <Label>Họ tên</Label>
              <Input {...register("fullName", { required: true })} />
              {errors.fullName && <p className="text-xs text-destructive">Bắt buộc</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" {...register("email", { required: true })} />
            </div>
            <div className="space-y-1.5">
              <Label>Mật khẩu</Label>
              <Input type="password" {...register("password", { required: true, minLength: 6 })} />
            </div>
            <div className="space-y-1.5">
              <Label>Vai trò</Label>
              <Select onValueChange={(v) => setValue("roleId", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn vai trò" />
                </SelectTrigger>
                <SelectContent>
                  {roles?.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {ROLE_LABELS[r.name] ?? r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Chi nhánh được phép truy cập</Label>
              <div className="flex flex-wrap gap-2">
                {branches?.map((b) => (
                  <button
                    type="button"
                    key={b.id}
                    onClick={() => toggleBranch(b.id)}
                    className={
                      selectedBranches.includes(b.id)
                        ? "rounded-md bg-primary px-2.5 py-1 text-xs text-primary-foreground"
                        : "rounded-md border px-2.5 py-1 text-xs text-muted-foreground"
                    }
                  >
                    {b.name}
                  </button>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={createUser.isPending}>
                {createUser.isPending ? "Đang lưu..." : "Lưu nhân viên"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
