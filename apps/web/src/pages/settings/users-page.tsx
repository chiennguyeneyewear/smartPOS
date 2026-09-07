import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Plus } from "lucide-react";
import { MENU_ITEM_LABELS, MENU_ITEMS, DEFAULT_MENU_ACCESS, type RoleName } from "@smartpos/shared";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBranches } from "@/features/branches/hooks";
import { useCreateUser, useRoles, useUpdateUser, useUsers } from "@/features/users/hooks";
import type { CreateUserInput, RoleRow, UserRow } from "@/features/users/api";

const ROLE_LABELS: Record<string, string> = {
  admin: "Quản trị viên",
  manager: "Quản lý",
  cashier: "Thu ngân",
  warehouse: "Thủ kho",
};

const MENU_KEYS = Object.values(MENU_ITEMS);

interface FormValues {
  fullName: string;
  email: string;
  password: string;
  roleId: string;
}

function emptyForm(): FormValues {
  return { fullName: "", email: "", password: "", roleId: "" };
}

export function UsersPage() {
  const [open, setOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [selectedMenu, setSelectedMenu] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);

  const { data: users, isLoading } = useUsers();
  const { data: roles } = useRoles();
  const { data: branches } = useBranches();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({ defaultValues: emptyForm() });

  const roleId = watch("roleId");
  const isEditing = !!editingUser;

  function roleName(id: string): string {
    return roles?.find((r) => r.id === id)?.name ?? "";
  }

  // When creating a new user (not editing) and the role changes, prefill the menu
  // checkboxes with that role's sensible default so the admin usually doesn't need
  // to touch them — they can still uncheck/check individual items afterward.
  useEffect(() => {
    if (isEditing || !roleId) return;
    const name = roleName(roleId) as RoleName;
    setSelectedMenu(DEFAULT_MENU_ACCESS[name] ?? []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleId, isEditing]);

  function toggleBranch(id: string) {
    setSelectedBranches((prev) => (prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]));
  }

  function toggleMenu(key: string) {
    setSelectedMenu((prev) => (prev.includes(key) ? prev.filter((m) => m !== key) : [...prev, key]));
  }

  function openCreateDialog() {
    setEditingUser(null);
    reset(emptyForm());
    setSelectedBranches([]);
    setSelectedMenu([]);
    setIsActive(true);
    setOpen(true);
  }

  function openEditDialog(user: UserRow) {
    setEditingUser(user);
    reset({ fullName: user.fullName, email: user.email, password: "", roleId: user.roleId });
    setSelectedBranches(user.branches.map((b) => b.id));
    setSelectedMenu(user.menuAccess);
    setIsActive(user.isActive);
    setOpen(true);
  }

  const onSubmit = handleSubmit((values) => {
    if (editingUser) {
      updateUser.mutate(
        {
          id: editingUser.id,
          input: {
            fullName: values.fullName,
            roleId: values.roleId,
            isActive,
            menuAccess: selectedMenu,
            branchIds: selectedBranches,
            ...(values.password ? { password: values.password } : {}),
          },
        },
        { onSuccess: () => setOpen(false) },
      );
      return;
    }
    createUser.mutate(
      {
        fullName: values.fullName,
        email: values.email,
        password: values.password,
        roleId: values.roleId,
        branchIds: selectedBranches,
        menuAccess: selectedMenu,
      } satisfies CreateUserInput,
      { onSuccess: () => setOpen(false) },
    );
  });

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
      id: "menuAccess",
      header: "Menu được xem",
      cell: ({ row }) =>
        row.original.menuAccess.map((key) => MENU_ITEM_LABELS[key as keyof typeof MENU_ITEM_LABELS] ?? key).join(", "),
    },
    {
      accessorKey: "isActive",
      header: "Trạng thái",
      cell: ({ getValue }) => (getValue() ? <Badge variant="success">Hoạt động</Badge> : <Badge variant="secondary">Đã khóa</Badge>),
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

  const isPending = createUser.isPending || updateUser.isPending;

  return (
    <div>
      <PageHeader
        title="Nhân viên"
        description="Quản lý tài khoản &amp; phân quyền"
        actions={
          <Button onClick={openCreateDialog} className="gap-1.5">
            <Plus className="h-4 w-4" /> Thêm nhân viên
          </Button>
        }
      />
      <DataTable columns={columns} data={users ?? []} isLoading={isLoading} emptyMessage="Chưa có nhân viên" />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditing ? `Sửa nhân viên — ${editingUser?.fullName}` : "Thêm nhân viên"}</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-1.5">
              <Label>Họ tên</Label>
              <Input {...register("fullName", { required: true })} />
              {errors.fullName && <p className="text-xs text-destructive">Bắt buộc</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" disabled={isEditing} {...register("email", { required: true })} />
            </div>
            <div className="space-y-1.5">
              <Label>{isEditing ? "Mật khẩu mới (để trống nếu không đổi)" : "Mật khẩu"}</Label>
              <Input type="password" {...register("password", { required: !isEditing, minLength: 6 })} />
            </div>
            <div className="space-y-1.5">
              <Label>Vai trò</Label>
              <Select value={roleId} onValueChange={(v) => setValue("roleId", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn vai trò" />
                </SelectTrigger>
                <SelectContent>
                  {roles?.map((r: RoleRow) => (
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
            <div className="space-y-1.5">
              <Label>Menu được phép xem</Label>
              <div className="flex flex-wrap gap-2">
                {MENU_KEYS.map((key) => (
                  <button
                    type="button"
                    key={key}
                    onClick={() => toggleMenu(key)}
                    className={
                      selectedMenu.includes(key)
                        ? "rounded-md bg-primary px-2.5 py-1 text-xs text-primary-foreground"
                        : "rounded-md border px-2.5 py-1 text-xs text-muted-foreground"
                    }
                  >
                    {MENU_ITEM_LABELS[key]}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Chỉ áp dụng cho menu hiển thị — quyền thao tác (thêm/sửa/xóa) vẫn theo vai trò.
              </p>
            </div>
            {isEditing && (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
                Tài khoản đang hoạt động
              </label>
            )}
            <DialogFooter>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Đang lưu..." : "Lưu nhân viên"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
