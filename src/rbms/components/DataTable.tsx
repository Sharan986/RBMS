import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button, EmptyState, ErrorState, LoadingState } from "./ui";

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  align?: "left" | "right" | "center";
  width?: string;
  render: (row: T) => ReactNode;
}

export interface SortState {
  sortBy: string;
  sortDir: "asc" | "desc";
}

export function DataTable<T extends { id: string }>({
  columns,
  rows,
  isLoading,
  error,
  onRetry,
  emptyMessage = "No records found.",
  emptyHint,
  onRowClick,
  sort,
  onSortChange,
  page,
  pageSize,
  total,
  onPageChange,
  dense,
}: {
  columns: Column<T>[];
  rows: T[];
  isLoading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  emptyMessage?: string;
  emptyHint?: string;
  onRowClick?: (row: T) => void;
  sort?: SortState;
  onSortChange?: (s: SortState) => void;
  page?: number;
  pageSize?: number;
  total?: number;
  onPageChange?: (p: number) => void;
  dense?: boolean;
}) {
  const showPager = typeof total === "number" && typeof page === "number" && typeof pageSize === "number";
  const pageCount = showPager ? Math.max(1, Math.ceil(total! / pageSize!)) : 1;

  const toggleSort = (key: string) => {
    if (!onSortChange) return;
    if (sort?.sortBy === key) onSortChange({ sortBy: key, sortDir: sort.sortDir === "asc" ? "desc" : "asc" });
    else onSortChange({ sortBy: key, sortDir: "asc" });
  };

  return (
    <div>
      <div className="rbms-scroll overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-left">
          <thead className="sticky top-0 z-10 bg-panel-2">
            <tr className="border-b border-border">
              {columns.map((c) => (
                <th
                  key={c.key}
                  style={c.width ? { width: c.width } : undefined}
                  className={cn(
                    "px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground",
                    c.align === "right" && "text-right",
                    c.align === "center" && "text-center",
                  )}
                >
                  {c.sortable && onSortChange ? (
                    <button
                      onClick={() => toggleSort(c.key)}
                      className={cn(
                        "inline-flex items-center gap-1 hover:text-foreground",
                        sort?.sortBy === c.key && "text-foreground",
                      )}
                    >
                      {c.header}
                      {sort?.sortBy === c.key ? (
                        sort.sortDir === "asc" ? (
                          <ArrowUp className="h-3 w-3" />
                        ) : (
                          <ArrowDown className="h-3 w-3" />
                        )
                      ) : (
                        <ChevronsUpDown className="h-3 w-3 opacity-40" />
                      )}
                    </button>
                  ) : (
                    c.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!isLoading &&
              !error &&
              rows.map((row) => (
                <tr
                  key={row.id}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn(
                    "border-b border-border/70 transition-colors last:border-0",
                    onRowClick && "cursor-pointer hover:bg-accent/60",
                  )}
                >
                  {columns.map((c) => (
                    <td
                      key={c.key}
                      className={cn(
                        "px-3 text-[12.5px] text-foreground",
                        dense ? "py-1.5" : "py-2.5",
                        c.align === "right" && "text-right",
                        c.align === "center" && "text-center",
                      )}
                    >
                      {c.render(row)}
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {isLoading && <LoadingState />}
      {!isLoading && !!error && <ErrorState error={error} onRetry={onRetry} />}
      {!isLoading && !error && rows.length === 0 && <EmptyState message={emptyMessage} hint={emptyHint} />}

      {showPager && !isLoading && !error && total! > 0 && (
        <div className="flex items-center justify-between border-t border-border px-3 py-2">
          <p className="text-[11.5px] text-muted-foreground">
            Showing {(page! - 1) * pageSize! + 1}–{Math.min(page! * pageSize!, total!)} of {total} records
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page! <= 1}
              onClick={() => onPageChange?.(page! - 1)}
            >
              Previous
            </Button>
            <span className="tnum text-[11.5px] text-muted-foreground">
              Page {page} of {pageCount}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page! >= pageCount}
              onClick={() => onPageChange?.(page! + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
