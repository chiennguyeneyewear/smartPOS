import { useEffect, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { ChevronLeft, ChevronRight, Plus, Search, Upload } from "lucide-react";
import type { CustomerSummary } from "@smartpos/shared";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { CustomerFormDialog } from "@/components/shared/customer-form-dialog";
import { CustomerDetailTabs } from "@/components/shared/customer-detail-tabs";
import { CustomerImportDialog } from "./customer-import-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { useCustomerList } from "@/features/customers/hooks";

const columns: ColumnDef<CustomerSummary, any>[] = [
  { accessorKey: "code", header: "Mã KH" },
  { accessorKey: "name", header: "Tên khách hàng", cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
  { accessorKey: "phone", header: "Điện thoại" },
  { accessorKey: "address", header: "Địa chỉ" },
  { accessorKey: "groupName", header: "Nhóm" },
  {
    accessorKey: "debtBalance",
    header: "Công nợ",
    cell: ({ getValue }) => {
      const value = getValue() as number;
      return value > 0 ? <Badge variant="destructive">{formatCurrency(value)}</Badge> : formatCurrency(value);
    },
  },
];

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
  const { data, isLoading } = useCustomerList(search, page, pageSize);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const customers = data?.data ?? [];
  const total = data?.meta.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-4">
      <PageHeader
        title="Khách hàng"
        description="Quản lý danh sách khách hàng &amp; công nợ"
        actions={
          <div className="flex items-center gap-2">
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
    </div>
  );
}
