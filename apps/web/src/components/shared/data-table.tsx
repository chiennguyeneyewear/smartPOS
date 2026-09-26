import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
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
  // Tighter cell padding, for tables that have to fit many columns without a sideways scrollbar.
  compact?: boolean;
}

export function DataTable<TData>({
  columns,
  data,
  isLoading,
  emptyMessage,
  onRowClick,
  isRowSelected,
  renderExpandedRow,
  compact,
}: DataTableProps<TData>) {
  const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel() });

  // The table can be wider than its scroll container; expanded rows are pinned to the
  // visible width so their content (and buttons) stay reachable without scrolling sideways.
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [visibleWidth, setVisibleWidth] = useState<number>();
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const update = () => setVisibleWidth(el.clientWidth);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={wrapperRef} className="overflow-auto rounded-md border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className={cn(
                    "whitespace-nowrap text-left text-sm font-semibold text-muted-foreground",
                    compact ? "px-2.5 py-3" : "p-3",
                  )}
                >
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
              const selected = isRowSelected?.(row.original) ?? false;
              const expanded = selected && !!renderExpandedRow;
              return (
                <Fragment key={row.id}>
                  <tr
                    onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                    className={cn(
                      "border-t transition-colors hover:bg-accent",
                      onRowClick && "cursor-pointer",
                      selected && "bg-primary/10",
                    )}
                  >
                    {row.getVisibleCells().map((cell, i) => (
                      <td
                        key={cell.id}
                        className={cn(
                          "whitespace-nowrap",
                          compact ? "px-2.5 py-3" : "p-3",
                          i === 0 && selected && "border-l-[3px] border-l-primary",
                          i === 0 && selected && (compact ? "pl-[7px]" : "pl-[9px]"),
                        )}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                  {expanded && (
                    <tr className="border-t bg-primary/5">
                      <td colSpan={columns.length} className="border-l-[3px] border-l-primary p-4">
                        <div className="sticky left-0" style={{ width: visibleWidth ? visibleWidth - 35 : undefined }}>
                          {renderExpandedRow!(row.original)}
                        </div>
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
