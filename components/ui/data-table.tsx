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
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>(initialSorting);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [rowSelection, setRowSelection] = React.useState({});
  const [searchColumn, setSearchColumn] = useState<string>(searchKey || (searchableColumns.length > 0 ? searchableColumns[0].id : ""));

  // Use the searchKey as a searchable column if provided for backward compatibility
  const allSearchableColumns = searchKey && !searchableColumns.some(col => col.id === searchKey)
    ? [{ id: searchKey, displayName: "Search" }, ...searchableColumns]
    : searchableColumns;

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
    enableSorting,
    state: {
      sorting,
      columnFilters,
      rowSelection,
    },
  });

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
      {allSearchableColumns.length > 0 && (
        <div className="flex items-center py-4 gap-2">
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
    </div>
  );
} 