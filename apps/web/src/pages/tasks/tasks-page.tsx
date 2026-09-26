import { useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Plus, Trash2, Users } from "lucide-react";
import {
  EMPLOYEE_KIND,
  TASK_STATUS,
  employeeSchema,
  taskSchema,
  type EmployeeKind,
  type EmployeeSummary,
  type TaskStatus,
  type TaskSummary,
} from "@smartpos/shared";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PERIOD_PRESET_OPTIONS, getPeriodRange, type PeriodPreset } from "@/lib/period-presets";
import { cn, formatDateTime } from "@/lib/utils";
import { useBranches } from "@/features/branches/hooks";
import { Countdown } from "./countdown";
import {
  useCreateEmployee,
  useCreateTask,
  useDeleteEmployee,
  useDeleteTask,
  useEmployees,
  useTasks,
  useUpdateTask,
} from "@/features/tasks/hooks";

const STATUS_LABELS: Record<TaskStatus, string> = {
  PENDING: "Chưa hoàn thành",
  DONE: "Đã hoàn thành",
};

const STATUS_TRIGGER_CLASS: Record<TaskStatus, string> = {
  PENDING: "border-amber-300 bg-amber-50 text-amber-700",
  DONE: "border-success/40 bg-success/10 text-success",
};

// The deadline is entered as a date plus a 24-hour "HH:mm" text field: the browser's own time picker
// follows the OS locale and shows 12-hour AM/PM, which can't be forced to 24h.
const pad2 = (n: number) => String(n).padStart(2, "0");

function toLocalDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function toLocalTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

// "1730" -> "17:30" as the user types.
function maskTime(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : digits;
}

function sortedBranches<T extends { name: string }>(branches: T[] | undefined): T[] {
  return [...(branches ?? [])].sort((a, b) => a.name.localeCompare(b.name, "vi", { numeric: true }));
}

const KIND_TEXT: Record<
  EmployeeKind,
  { manageTitle: string; addLabel: string; placeholder: string; deleteTitle: string; noun: string }
> = {
  ASSIGNER: {
    manageTitle: "Quản lý người giao việc",
    addLabel: "Thêm người giao việc",
    placeholder: "Tên người giao việc",
    deleteTitle: "Xóa người giao việc",
    noun: "người giao việc",
  },
  ASSIGNEE: {
    manageTitle: "Quản lý nhân viên nhận việc",
    addLabel: "Thêm nhân viên",
    placeholder: "Tên nhân viên",
    deleteTitle: "Xóa nhân viên",
    noun: "nhân viên",
  },
};

// The list for a picker, plus the person already on the task if they have since been removed.
function withCurrentPerson(
  list: EmployeeSummary[],
  current: { id: string; name: string; kind: EmployeeKind } | null,
): EmployeeSummary[] {
  if (!current || list.some((e) => e.id === current.id)) return list;
  return [...list, { id: current.id, name: `${current.name} (đã xóa)`, kind: current.kind }];
}

function EmployeeSelect({
  value,
  onChange,
  employees,
  placeholder,
}: {
  value: string;
  onChange: (id: string) => void;
  employees: EmployeeSummary[];
  placeholder: string;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {employees.map((e) => (
          <SelectItem key={e.id} value={e.id}>
            {e.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function ManageLink({ onClick, children }: { onClick: () => void; children: string }) {
  return (
    <button type="button" onClick={onClick} className="text-xs font-medium text-primary hover:underline">
      {children}
    </button>
  );
}

function EmployeeManagerDialog({
  kind,
  open,
  onOpenChange,
}: {
  kind: EmployeeKind;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const text = KIND_TEXT[kind];
  const { data: employees } = useEmployees(kind);
  const createEmployee = useCreateEmployee();
  const deleteEmployee = useDeleteEmployee();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<EmployeeSummary | null>(null);

  useEffect(() => {
    if (open) {
      setName("");
      setError(null);
    }
  }, [open]);

  function add() {
    const parsed = employeeSchema.safeParse({ name, kind });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Tên không hợp lệ");
      return;
    }
    setError(null);
    createEmployee.mutate(parsed.data, { onSuccess: () => setName("") });
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{text.manageTitle}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>{text.addLabel}</Label>
              <div className="flex gap-2">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && add()}
                  placeholder={text.placeholder}
                />
                <Button onClick={add} disabled={createEmployee.isPending} className="shrink-0 gap-1.5">
                  <Plus className="h-4 w-4" /> Thêm
                </Button>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
            <div className="max-h-72 divide-y overflow-y-auto rounded-md border">
              {employees?.length ? (
                employees.map((e) => (
                  <div key={e.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                    <span>{e.name}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setDeleting(e)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              ) : (
                <p className="p-4 text-center text-sm text-muted-foreground">Chưa có {text.noun} nào</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{text.deleteTitle}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Bạn có chắc muốn xóa {text.noun} <span className="font-medium text-foreground">{deleting?.name}</span> khỏi
            danh sách? Các công việc đã giao hoặc đã nhận của người này vẫn được giữ lại.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>
              Hủy
            </Button>
            <Button
              variant="destructive"
              disabled={deleteEmployee.isPending}
              onClick={() => deleting && deleteEmployee.mutate(deleting.id, { onSuccess: () => setDeleting(null) })}
            >
              {deleteEmployee.isPending ? "Đang xóa..." : "Xóa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function TaskFormDialog({
  open,
  onOpenChange,
  task,
  onManage,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: TaskSummary | null;
  onManage: (kind: EmployeeKind) => void;
}) {
  const { data: assigners } = useEmployees(EMPLOYEE_KIND.ASSIGNER);
  const { data: assignees } = useEmployees(EMPLOYEE_KIND.ASSIGNEE);
  const { data: branches } = useBranches();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignerId, setAssignerId] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [branchId, setBranchId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");
  const [status, setStatus] = useState<TaskStatus>(TASK_STATUS.PENDING);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTitle(task?.title ?? "");
    setDescription(task?.description ?? "");
    setAssignerId(task?.assignerId ?? "");
    setAssigneeId(task?.assigneeId ?? "");
    setBranchId(task?.branchId ?? "");
    setDueDate(toLocalDate(task?.dueAt));
    setDueTime(toLocalTime(task?.dueAt));
    setStatus(task?.status ?? TASK_STATUS.PENDING);
    setError(null);
  }, [open, task]);

  const assignerOptions = useMemo(
    () =>
      withCurrentPerson(
        assigners ?? [],
        task && { id: task.assignerId, name: task.assignerName, kind: EMPLOYEE_KIND.ASSIGNER },
      ),
    [assigners, task],
  );
  const assigneeOptions = useMemo(
    () =>
      withCurrentPerson(
        assignees ?? [],
        task && { id: task.assigneeId, name: task.assigneeName, kind: EMPLOYEE_KIND.ASSIGNEE },
      ),
    [assignees, task],
  );
  const pending = createTask.isPending || updateTask.isPending;

  function submit() {
    let dueAt: string | null = null;
    if (dueDate || dueTime) {
      if (!dueDate) {
        setError("Chọn ngày cho thời hạn hoàn thành");
        return;
      }
      const time = dueTime || "23:59";
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
        setError("Giờ không hợp lệ, nhập theo 24 giờ (VD: 17:30)");
        return;
      }
      dueAt = new Date(`${dueDate}T${time}`).toISOString();
    }
    const parsed = taskSchema.safeParse({
      title,
      description,
      assignerId,
      assigneeId,
      branchId,
      dueAt,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ");
      return;
    }
    const onSuccess = () => onOpenChange(false);
    if (task) {
      updateTask.mutate({ id: task.id, input: { ...parsed.data, status } }, { onSuccess });
    } else {
      createTask.mutate(parsed.data, { onSuccess });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{task ? "Sửa công việc" : "Giao công việc mới"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>Người giao việc</Label>
              <ManageLink onClick={() => onManage(EMPLOYEE_KIND.ASSIGNER)}>+ Thêm / xóa người giao việc</ManageLink>
            </div>
            <EmployeeSelect
              value={assignerId}
              onChange={setAssignerId}
              employees={assignerOptions}
              placeholder="Chọn người giao việc"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Tên công việc</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="VD: Kiểm kho gọng kính" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Chi nhánh</Label>
            <Select value={branchId} onValueChange={setBranchId}>
              <SelectTrigger>
                <SelectValue placeholder="Chọn chi nhánh" />
              </SelectTrigger>
              <SelectContent>
                {sortedBranches(branches).map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Thời hạn hoàn thành</Label>
            <div className="flex gap-2">
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              <Input
                value={dueTime}
                onChange={(e) => setDueTime(maskTime(e.target.value))}
                inputMode="numeric"
                placeholder="HH:mm"
                maxLength={5}
                className="w-[92px] shrink-0 text-center"
              />
            </div>
          </div>
          </div>
          <div className="space-y-1.5">
            <Label>Nội dung chi tiết</Label>
            <Textarea
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mô tả cụ thể việc cần làm..."
            />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>Người nhận việc</Label>
              <ManageLink onClick={() => onManage(EMPLOYEE_KIND.ASSIGNEE)}>+ Thêm / xóa nhân viên</ManageLink>
            </div>
            <EmployeeSelect
              value={assigneeId}
              onChange={setAssigneeId}
              employees={assigneeOptions}
              placeholder="Chọn người nhận"
            />
          </div>
          {task && (
            <div className="space-y-1.5">
              <Label>Trạng thái</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(TASK_STATUS).map((st) => (
                    <SelectItem key={st} value={st}>
                      {STATUS_LABELS[st]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending ? "Đang lưu..." : task ? "Lưu" : "Giao việc"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function TasksPage() {
  const { data: employees } = useEmployees(EMPLOYEE_KIND.ASSIGNEE);
  const { data: branches } = useBranches();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const [preset, setPreset] = useState<PeriodPreset>("all_time");
  const [statusFilter, setStatusFilter] = useState<"all" | TaskStatus>("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [branchFilter, setBranchFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [managerKind, setManagerKind] = useState<EmployeeKind | null>(null);
  const [editing, setEditing] = useState<TaskSummary | null>(null);
  const [deleting, setDeleting] = useState<TaskSummary | null>(null);

  const range = useMemo(() => getPeriodRange(preset), [preset]);
  const { data: tasks, isLoading } = useTasks({
    status: statusFilter === "all" ? undefined : statusFilter,
    assigneeId: assigneeFilter === "all" ? undefined : assigneeFilter,
    branchId: branchFilter === "all" ? undefined : branchFilter,
    from: preset === "all_time" ? undefined : range.from.toISOString(),
    to: preset === "all_time" ? undefined : range.to.toISOString(),
  });

  const list = tasks ?? [];
  const pendingCount = list.filter((t) => t.status === TASK_STATUS.PENDING).length;
  const doneCount = list.length - pendingCount;

  const columns: ColumnDef<TaskSummary, unknown>[] = [
    { id: "createdAt", header: "Ngày giao", cell: ({ row }) => formatDateTime(row.original.createdAt) },
    {
      id: "title",
      header: "Tên công việc",
      cell: ({ row }) => <span className="block max-w-[260px] truncate font-medium">{row.original.title}</span>,
    },
    { id: "branch", header: "Chi nhánh", cell: ({ row }) => row.original.branchName ?? "" },
    {
      id: "description",
      header: "Nội dung",
      cell: ({ row }) => (
        <span className="block max-w-[320px] truncate text-muted-foreground">{row.original.description}</span>
      ),
    },
    { id: "assigner", header: "Người giao", cell: ({ row }) => row.original.assignerName },
    { id: "assignee", header: "Người nhận", cell: ({ row }) => row.original.assigneeName },
    {
      id: "dueAt",
      header: "Thời hạn",
      cell: ({ row }) => {
        const t = row.original;
        return (
          <div className="leading-tight">
            {t.dueAt && <div className="text-xs text-muted-foreground">{formatDateTime(t.dueAt)}</div>}
            <Countdown dueAt={t.dueAt} done={t.status === TASK_STATUS.DONE} completedAt={t.completedAt} />
          </div>
        );
      },
    },
    {
      id: "status",
      header: "Trạng thái",
      cell: ({ row }) => {
        const t = row.original;
        return (
          <div onClick={(e) => e.stopPropagation()}>
            <Select
              value={t.status}
              disabled={updateTask.isPending}
              onValueChange={(v) => updateTask.mutate({ id: t.id, input: { status: v as TaskStatus } })}
            >
              <SelectTrigger className={cn("h-8 w-[165px] text-xs font-medium", STATUS_TRIGGER_CLASS[t.status])}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(TASK_STATUS).map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => {
                setEditing(row.original);
                setFormOpen(true);
              }}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={() => setDeleting(row.original)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Quản lý công việc"
        description="Giao việc và theo dõi công việc hằng ngày"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" className="gap-1.5" onClick={() => setManagerKind(EMPLOYEE_KIND.ASSIGNEE)}>
              <Users className="h-4 w-4" /> Nhân viên
            </Button>
            <Button
              className="gap-1.5"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus className="h-4 w-4" /> Giao việc
            </Button>
          </div>
        }
      />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Select value={preset} onValueChange={(v) => setPreset(v as PeriodPreset)}>
          <SelectTrigger className="w-[170px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIOD_PRESET_OPTIONS.filter((o) => o.value !== "custom").map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as "all" | TaskStatus)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả trạng thái</SelectItem>
            {Object.values(TASK_STATUS).map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
          <SelectTrigger className="w-[170px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả người nhận</SelectItem>
            {employees?.map((e) => (
              <SelectItem key={e.id} value={e.id}>
                {e.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={branchFilter} onValueChange={setBranchFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả chi nhánh</SelectItem>
            {sortedBranches(branches).map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="ml-auto flex items-center gap-2 text-sm">
          <span className="rounded-full bg-amber-50 px-3 py-1 font-medium text-amber-700">
            Chưa hoàn thành: {pendingCount}
          </span>
          <span className="rounded-full bg-success/10 px-3 py-1 font-medium text-success">
            Đã hoàn thành: {doneCount}
          </span>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={list}
        isLoading={isLoading}
        emptyMessage="Chưa có công việc nào"
        onRowClick={(row) => setExpandedId((prev) => (prev === row.id ? null : row.id))}
        isRowSelected={(row) => row.id === expandedId}
        renderExpandedRow={(row) => (
          <Card className="shadow-none">
            <CardContent className="space-y-3 p-4 text-sm">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Nội dung chi tiết</p>
                <p className="mt-1 whitespace-pre-wrap">{row.description || "Không có nội dung"}</p>
              </div>
              <div className="flex flex-wrap gap-x-8 gap-y-1 text-muted-foreground">
                <span>Giao lúc: {formatDateTime(row.createdAt)}</span>
                {row.dueAt && <span>Hạn hoàn thành: {formatDateTime(row.dueAt)}</span>}
                {row.completedAt && <span>Hoàn thành lúc: {formatDateTime(row.completedAt)}</span>}
              </div>
            </CardContent>
          </Card>
        )}
      />

      <TaskFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        task={editing}
        onManage={setManagerKind}
      />

      <EmployeeManagerDialog
        kind={managerKind ?? EMPLOYEE_KIND.ASSIGNEE}
        open={managerKind !== null}
        onOpenChange={(o) => !o && setManagerKind(null)}
      />

      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xóa công việc</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Bạn có chắc muốn xóa công việc <span className="font-medium text-foreground">{deleting?.title}</span>?
            Hành động này không thể hoàn tác.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>
              Hủy
            </Button>
            <Button
              variant="destructive"
              disabled={deleteTask.isPending}
              onClick={() => deleting && deleteTask.mutate(deleting.id, { onSuccess: () => setDeleting(null) })}
            >
              {deleteTask.isPending ? "Đang xóa..." : "Xóa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
