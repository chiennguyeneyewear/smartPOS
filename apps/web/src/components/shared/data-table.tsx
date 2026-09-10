import { Fragment, type ReactNode } from "react";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { cn } from "@/lib/utils";

interface DataTableProps<TData> {
  columns: ColumnDef<TData, any>[];
  data: TData[];
  isLoading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: TData) => void;
  isRowSelected?: (row: TData) => boolean;
  // Renders extra content in its own full-width row directly under a
  // selected row (e.g. the customer detail panel), instead of after the
  // whole table — matching KiotViet's inline row-expansion behavior.
  renderExpandedRow?: (row: TData) => ReactNode;
}

export function DataTable<TData>({
  columns,
  data,
  isLoading,
  emptyMessage,
  onRowClick,
  isRowSelected,
  renderExpandedRow,
}: DataTableProps<TData>) {
  const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel() });

  return (
    <div className="overflow-auto rounded-md border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th key={header.id} className="whitespace-nowrap p-3 text-left text-sm font-semibold text-muted-foreground">
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {isLoading && (
            <tr>
              <td colSpan={columns.length} className="p-6 text-center text-sm text-muted-foreground">
                Đang tải dữ liệu...
              </td>
            </tr>
          )}
          {!isLoading && data.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="p-6 text-center text-sm text-muted-foreground">
                {emptyMessage ?? "Không có dữ liệu"}
              </td>
            </tr>
          )}
          {!isLoading &&
            table.getRowModel().rows.map((row) => {
              const expanded = isRowSelected?.(row.original) && !!renderExpandedRow;
              return (
                <Fragment key={row.id}>
                  <tr
                    onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                    className={cn(
                      "border-t hover:bg-accent/40",
                      onRowClick && "cursor-pointer",
                      isRowSelected?.(row.original) && "bg-accent/60",
                    )}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="whitespace-nowrap p-3">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                  {expanded && (
                    <tr className="border-t bg-muted/20">
                      <td colSpan={columns.length} className="p-4">
                        {renderExpandedRow!(row.original)}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
        </tbody>
      </table>
    </div>
  );
}
