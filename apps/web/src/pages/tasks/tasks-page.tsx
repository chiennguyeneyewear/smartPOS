import { useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { TASK_STATUS, taskSchema, type TaskStatus, type TaskSummary } from "@smartpos/shared";
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
import { useAuthStore } from "@/stores/auth-store";
import { useAssignees, useCreateTask, useDeleteTask, useTasks, useUpdateTask } from "@/features/tasks/hooks";

const STATUS_LABELS: Record<TaskStatus, string> = {
  PENDING: "Chưa hoàn thành",
  DONE: "Đã hoàn thành",
};

const STATUS_TRIGGER_CLASS: Record<TaskStatus, string> = {
  PENDING: "border-amber-300 bg-amber-50 text-amber-700",
  DONE: "border-success/40 bg-success/10 text-success",
};

function TaskFormDialog({
  open,
  onOpenChange,
  task,
  assignerName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: TaskSummary | null;
  assignerName: string;
}) {
  const { data: assignees } = useAssignees();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [status, setStatus] = useState<TaskStatus>(TASK_STATUS.PENDING);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTitle(task?.title ?? "");
    setDescription(task?.description ?? "");
    setAssigneeId(task?.assigneeId ?? "");
    setStatus(task?.status ?? TASK_STATUS.PENDING);
    setError(null);
  }, [open, task]);

  const pending = createTask.isPending || updateTask.isPending;

  function submit() {
    const parsed = taskSchema.safeParse({ title, description, assigneeId });
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
            <Label>Người giao việc</Label>
            <Input value={task?.assignerName ?? assignerName} disabled />
          </div>
          <div className="space-y-1.5">
            <Label>Tên công việc</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="VD: Kiểm kho gọng kính" />
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Người nhận việc</Label>
              <Select value={assigneeId} onValueChange={setAssigneeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn người nhận" />
                </SelectTrigger>
                <SelectContent>
                  {assignees?.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {task && (
              <div className="space-y-1.5">
                <Label>Trạng thái</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}>
                  <SelectTrigger>
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
            )}
          </div>
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
  const me = useAuthStore((s) => s.user);
  const isAdmin = me?.role === "admin";
  const { data: assignees } = useAssignees();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const [preset, setPreset] = useState<PeriodPreset>("all_time");
  const [statusFilter, setStatusFilter] = useState<"all" | TaskStatus>("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TaskSummary | null>(null);
  const [deleting, setDeleting] = useState<TaskSummary | null>(null);

  const range = useMemo(() => getPeriodRange(preset), [preset]);
  const { data: tasks, isLoading } = useTasks({
    status: statusFilter === "all" ? undefined : statusFilter,
    assigneeId: assigneeFilter === "all" ? undefined : assigneeFilter,
    from: preset === "all_time" ? undefined : range.from.toISOString(),
    to: preset === "all_time" ? undefined : range.to.toISOString(),
  });

  const list = tasks ?? [];
  const pendingCount = list.filter((t) => t.status === TASK_STATUS.PENDING).length;
  const doneCount = list.length - pendingCount;

  const canEdit = (t: TaskSummary) => isAdmin || t.assignerId === me?.id;
  const canChangeStatus = (t: TaskSummary) => canEdit(t) || t.assigneeId === me?.id;

  const columns: ColumnDef<TaskSummary, unknown>[] = [
    { id: "createdAt", header: "Ngày giao", cell: ({ row }) => formatDateTime(row.original.createdAt) },
    {
      id: "title",
      header: "Tên công việc",
      cell: ({ row }) => <span className="block max-w-[260px] truncate font-medium">{row.original.title}</span>,
    },
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
      id: "status",
      header: "Trạng thái",
      cell: ({ row }) => {
        const t = row.original;
        return (
          <div onClick={(e) => e.stopPropagation()}>
            <Select
              value={t.status}
              disabled={!canChangeStatus(t) || updateTask.isPending}
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
      cell: ({ row }) =>
        canEdit(row.original) && (
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
          <Button
            className="gap-1.5"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> Giao việc
          </Button>
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
            {assignees?.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.username}
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
        assignerName={me?.username ?? ""}
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
