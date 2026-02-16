"use client";

import * as React from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  ColumnFiltersState,
  getFilteredRowModel,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ChevronRight, Search, SlidersHorizontal, FileDown } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchKey?: string;
  onRowClick?: (row: TData) => void;
  isLoading?: boolean;
  onSearch?: (value: string) => void;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  onRowClick,
  isLoading,
  onSearch,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center flex-1 max-w-sm relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          {searchKey && (
            <Input
              placeholder={`Search ${searchKey}...`}
              value={onSearch ? undefined : (table.getColumn(searchKey)?.getFilterValue() as string) ?? ""}
              onChange={(event) => {
                if (onSearch) {
                  onSearch(event.target.value);
                } else {
                  table.getColumn(searchKey)?.setFilterValue(event.target.value);
                }
              }}
              className="pl-9 bg-card border-border shadow-sm"
            />
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2 h-9">
            <SlidersHorizontal className="h-4 w-4" />
            Filters
          </Button>
          <Button variant="outline" size="sm" className="h-9 gap-2">
            <FileDown className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>
      
      <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent bg-muted/30 border-b border-border/50">
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id} className="text-xs font-semibold text-muted-foreground py-4 uppercase tracking-wider">
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {columns.map((_, j) => (
                    <TableCell key={j} className="py-4">
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row, index) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  onClick={() => onRowClick && onRowClick(row.original)}
                  className={`
                    ${onRowClick ? "cursor-pointer" : ""}
                    transition-all duration-200
                    hover:bg-primary/5 hover:border-l-2 hover:border-l-primary
                    ${index % 2 === 1 ? "bg-muted/20" : ""}
                    border-l-2 border-l-transparent
                  `}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-4 text-sm">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-[400px] text-center">
                  <div className="flex flex-col items-center justify-center space-y-3 animate-fade-in-up">
                    <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mb-2">
                       <Search className="h-8 w-8 text-muted-foreground/40" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-foreground">No records found</p>
                      <p className="text-xs text-muted-foreground max-w-[200px] mx-auto">
                        We couldn't find any data matching your request. Try adjusting your filters.
                      </p>
                    </div>
                    <Button variant="outline" size="sm" className="mt-4 font-medium" onClick={() => table.resetColumnFilters()}>
                      Clear all filters
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between px-2">
        <div className="text-xs text-muted-foreground font-medium">
          Showing <span className="text-foreground font-semibold">{table.getRowModel().rows.length}</span> of <span className="text-foreground font-semibold">{data.length}</span> entries
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-1">
             {Array.from({ length: Math.min(table.getPageCount(), 5) }, (_, i) => i + 1).map((page) => (
               <Button
                 key={page}
                 variant={table.getState().pagination.pageIndex + 1 === page ? "default" : "ghost"}
                 size="sm"
                 className={`h-8 w-8 p-0 text-xs font-medium ${
                   table.getState().pagination.pageIndex + 1 === page 
                     ? "shadow-glow" 
                     : ""
                 }`}
                 onClick={() => table.setPageIndex(page - 1)}
               >
                 {page}
               </Button>
             ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
