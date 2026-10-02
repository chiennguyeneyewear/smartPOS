import { useEffect, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Plus, Search, Trash2, Upload } from "lucide-react";
import type { CustomerSummary } from "@smartpos/shared";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { CustomerFormDialog } from "@/components/shared/customer-form-dialog";
import { CustomerDetailTabs } from "@/components/shared/customer-detail-tabs";
import { CustomerImportDialog } from "./customer-import-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils";
import { useCustomerList, useDeleteCustomer } from "@/features/customers/hooks";

type SortDir = "asc" | "desc";

// Column title that sorts the whole list (all pages, not just the 50 shown) when clicked: first click ascending
// (A to Z, small to large), second click descending.
function SortHeader({
  label,
  field,
  sortBy,
  sortDir,
  onSort,
}: {
  label: string;
  field: string;
  sortBy: string;
  sortDir: SortDir;
  onSort: (field: string) => void;
}) {
  const active = sortBy === field;
  const Icon = !active ? ArrowUpDown : sortDir === "asc" ? ArrowUp : ArrowDown;
  return (
    <button
      type="button"
      onClick={() => onSort(field)}
      className="inline-flex items-center gap-1.5 font-semibold hover:text-foreground"
      title="Bấm để sắp xếp"
    >
      {label}
      <Icon className={active ? "h-3.5 w-3.5 text-primary" : "h-3.5 w-3.5 opacity-50"} />
    </button>
  );
}

function formatNumber(value: number): string {
  return value.toLocaleString("en-US");
}

export function CustomersPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 50;
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<{ ids: string[]; label: string } | null>(null);
  const [sortBy, setSortBy] = useState("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const { data, isLoading } = useCustomerList(search, page, pageSize, { sortBy, sortDir });
  const deleteCustomer = useDeleteCustomer();

  useEffect(() => {
    setPage(1);
  }, [search, sortBy, sortDir]);

  function handleSort(field: string) {
    if (field === sortBy) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortBy(field);
      setSortDir("asc");
    }
  }

  function toggleOne(customer: CustomerSummary) {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(customer.id)) next.delete(customer.id);
      else next.add(customer.id);
      return next;
    });
  }

  function toggleAll() {
    setCheckedIds(allChecked ? new Set() : new Set(customers.map((c) => c.id)));
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    await Promise.all(deleteTarget.ids.map((id) => deleteCustomer.mutateAsync(id)));
    setCheckedIds((prev) => {
      const next = new Set(prev);
      deleteTarget.ids.forEach((id) => next.delete(id));
      return next;
    });
    if (deleteTarget.ids.includes(selectedCustomerId ?? "")) setSelectedCustomerId(null);
    setDeleteTarget(null);
  }

  const head = (label: string, field: string) => (
    <SortHeader label={label} field={field} sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
  );
  const columns: ColumnDef<CustomerSummary, any>[] = [
    { accessorKey: "code", header: () => head("Mã khách hàng", "code") },
    {
      accessorKey: "name",
      header: () => head("Tên khách hàng", "name"),
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
    },
    { accessorKey: "phone", header: () => head("Điện thoại", "phone") },
    { accessorKey: "address", header: () => head("Địa chỉ", "address") },
    { accessorKey: "groupName", header: () => head("Nhóm", "groupName") },
    {
      accessorKey: "debtBalance",
      header: () => head("Công nợ", "debtBalance"),
      cell: ({ getValue }) => {
        const value = getValue() as number;
        return value > 0 ? <Badge variant="destructive">{formatCurrency(value)}</Badge> : formatCurrency(value);
      },
    },
  ];

  const customers = data?.data ?? [];
  const total = data?.meta?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const allChecked = customers.length > 0 && customers.every((c) => checkedIds.has(c.id));

  return (
    <div className="space-y-4">
      <PageHeader
        title="Khách hàng"
        description="Quản lý danh sách khách hàng &amp; công nợ"
        actions={
          <div className="flex items-center gap-2">
            {checkedIds.size > 0 && (
              <Button
                variant="outline"
                className="gap-1.5 border-destructive text-destructive hover:bg-destructive/5"
                onClick={() =>
                  setDeleteTarget({ ids: Array.from(checkedIds), label: `${checkedIds.size} khách hàng đã chọn` })
                }
              >
                <Trash2 className="h-4 w-4" />
                Xóa ({checkedIds.size})
              </Button>
            )}
            <Button variant="outline" onClick={() => setImportOpen(true)} className="gap-1.5">
              <Upload className="h-4 w-4" /> Import
            </Button>
            <Button onClick={() => setOpen(true)} className="gap-1.5">
              <Plus className="h-4 w-4" /> Thêm khách hàng
            </Button>
          </div>
        }
      />
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm theo tên, SĐT..." className="pl-8" />
      </div>
      <DataTable
        columns={columns}
        data={customers}
        isLoading={isLoading}
        emptyMessage="Chưa có khách hàng"
        onRowClick={(row) => setSelectedCustomerId(row.id === selectedCustomerId ? null : row.id)}
        isRowSelected={(row) => row.id === selectedCustomerId}
        renderExpandedRow={(row) => <CustomerDetailTabs customerId={row.id} />}
        selection={{
          isChecked: (row) => checkedIds.has(row.id),
          onToggle: toggleOne,
          allChecked,
          onToggleAll: toggleAll,
        }}
      />

      {!isLoading && total > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} / {formatNumber(total)} khách hàng
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" /> Trước
            </Button>
            <span>
              Trang {page}/{totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Sau <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <CustomerFormDialog open={open} onOpenChange={setOpen} />
      <CustomerImportDialog open={importOpen} onOpenChange={setImportOpen} />

      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xóa khách hàng</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Bạn có chắc chắn muốn xóa <span className="font-medium text-foreground">{deleteTarget?.label}</span>?
            Hành động này không thể hoàn tác.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Hủy
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleteCustomer.isPending}>
              {deleteCustomer.isPending ? "Đang xóa..." : "Xóa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
