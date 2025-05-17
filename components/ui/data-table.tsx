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
  getFilteredRowModel,
  ColumnFiltersState,
  VisibilityState,
} from "@tanstack/react-table";
import { useState } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from '@/lib/utils';
import { Search } from "lucide-react";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchKey?: string;
  searchableColumns?: {
    id: string;
    displayName: string;
  }[];
  onRowClick?: (row: TData) => void;
  noResults?: React.ReactNode;
  initialSorting?: SortingState;
  className?: string;
  enableSorting?: boolean;
  // New properties for enhanced filtering
  enableColumnFilters?: boolean;
  columnFilters?: ColumnFiltersState;
  onColumnFiltersChange?: (filters: ColumnFiltersState) => void;
  searchPlaceholder?: string;
  pagination?: boolean;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  searchableColumns = [],
  onRowClick,
  noResults,
  initialSorting = [],
  className,
  enableSorting = false,
  // New properties for enhanced filtering
  enableColumnFilters = false,
  columnFilters: controlledColumnFilters,
  onColumnFiltersChange,
  searchPlaceholder = "Search...",
  pagination = true,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>(initialSorting);
  const [uncontrolledColumnFilters, setUncontrolledColumnFilters] = useState<ColumnFiltersState>([]);
  const [rowSelection, setRowSelection] = React.useState({});
  const [searchColumn, setSearchColumn] = useState<string>(searchKey || (searchableColumns.length > 0 ? searchableColumns[0].id : ""));
  const [globalFilter, setGlobalFilter] = useState("");

  // Determine if we're using controlled or uncontrolled filters
  const columnFilters = controlledColumnFilters !== undefined ? controlledColumnFilters : uncontrolledColumnFilters;
  const setColumnFilters = onColumnFiltersChange || setUncontrolledColumnFilters;
  
  // Use the searchKey as a searchable column if provided for backward compatibility
  const allSearchableColumns = searchKey && !searchableColumns.some(col => col.id === searchKey)
    ? [{ id: searchKey, displayName: "Search" }, ...searchableColumns]
    : searchableColumns;

  // Setup column visibility state
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    enableSorting,
    enableColumnFilters,
    state: {
      sorting,
      columnFilters,
      rowSelection,
      columnVisibility,
      globalFilter,
    },
  });

  // Handle rendering of column filter UI
  const renderColumnFilterUI = (column: any) => {
    if (!column.getCanFilter()) return null;
    
    // Check if column has a custom filter component
    if (column.columnDef.meta?.filterComponent) {
      return column.columnDef.meta.filterComponent(column);
    }
    
    // Default filter UI based on column type
    return (
      <Input
        placeholder={`Filter ${column.id}...`}
        value={(column.getFilterValue() as string) ?? ""}
        onChange={(e) => column.setFilterValue(e.target.value)}
        className="max-w-sm"
      />
    );
  };

  if (data.length === 0) {
    return noResults ? (
      <div>{noResults}</div>
    ) : (
      <div className="flex items-center justify-center py-6 text-center">
        <p className="text-muted-foreground">No results found</p>
      </div>
    );
  }

  return (
    <div>
      {/* Global search bar */}
      {(allSearchableColumns.length > 0 || enableColumnFilters) && (
        <div className="flex items-center py-4 gap-2">
          {enableColumnFilters ? (
            <div className="flex w-full items-center relative">
              <Search className="h-4 w-4 absolute left-3 text-muted-foreground" />
              <Input
                placeholder={searchPlaceholder}
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="pl-9 max-w-sm"
              />
            </div>
          ) : (
            <>
              {allSearchableColumns.length > 1 && (
                <Select
                  value={searchColumn}
                  onValueChange={setSearchColumn}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select field to search" />
                  </SelectTrigger>
                  <SelectContent>
                    {allSearchableColumns.map((column) => (
                      <SelectItem key={column.id} value={column.id}>
                        {column.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Input
                placeholder={`Search by ${allSearchableColumns.find(col => col.id === searchColumn)?.displayName || 'search term'}...`}
                value={(table.getColumn(searchColumn)?.getFilterValue() as string) ?? ""}
                onChange={(event) =>
                  table.getColumn(searchColumn)?.setFilterValue(event.target.value)
                }
                className="max-w-sm"
              />
            </>
          )}
        </div>
      )}
      <div className={cn('rounded-md border', className)}>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead 
                      key={header.id}
                      className={header.column.getCanSort() ? "cursor-pointer select-none" : ""}
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      {header.isPlaceholder
                        ? null
                        : (
                          <div className="flex items-center gap-1">
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                            {{
                              asc: " ↑",
                              desc: " ↓",
                            }[header.column.getIsSorted() as string] ?? ""}
                          </div>
                        )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && 'selected'}
                onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                className={onRowClick ? 'cursor-pointer hover:bg-muted/50' : ''}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {pagination && (
        <div className="flex items-center justify-end space-x-2 py-4">
          <div className="flex-1 text-sm text-muted-foreground">
            {table.getFilteredSelectedRowModel().rows.length} of{" "}
            {table.getFilteredRowModel().rows.length} row(s) selected.
          </div>
          <div className="space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
} 