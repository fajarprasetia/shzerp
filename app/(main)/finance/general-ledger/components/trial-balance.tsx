"use client";

import { useState, useEffect } from "react";
import { DataTable } from "@/components/ui/data-table";
import { 
  AccountType, 
  TrialBalanceRow, 
  TrialBalanceSummary, 
  TrialBalanceData 
} from "@/types/finance";
import { ColumnDef } from "@tanstack/react-table";
import { formatCurrency } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface TrialBalanceProps {}

export function TrialBalance({}: TrialBalanceProps) {
  const [accounts, setAccounts] = useState<TrialBalanceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState<Date>(new Date());
  const [summary, setSummary] = useState<TrialBalanceSummary>({
    totalDebit: 0,
    totalCredit: 0,
    byType: {
      ASSET: { debit: 0, credit: 0 },
      LIABILITY: { debit: 0, credit: 0 },
      EQUITY: { debit: 0, credit: 0 },
      REVENUE: { debit: 0, credit: 0 },
      EXPENSE: { debit: 0, credit: 0 },
    },
  });

  const columns: ColumnDef<TrialBalanceRow>[] = [
    {
      accessorKey: "code",
      header: "Account Code",
    },
    {
      accessorKey: "name",
      header: "Account Name",
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => {
        const type = row.getValue("type") as AccountType;
        return type.replace(/_/g, " ");
      },
    },
    {
      accessorKey: "debit",
      header: "Debit",
      cell: ({ row }) => formatCurrency(row.getValue("debit") || 0),
    },
    {
      accessorKey: "credit",
      header: "Credit",
      cell: ({ row }) => formatCurrency(row.getValue("credit") || 0),
    },
  ];

  const fetchTrialBalance = async (asOfDate: Date) => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/finance/reports/trial-balance?date=${asOfDate.toISOString()}`
      );
      if (response.ok) {
        const data: TrialBalanceData = await response.json();
        setAccounts(data.accounts);
        setSummary(data.summary);
      }
    } catch (error) {
      console.error("Error fetching trial balance:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrialBalance(date);
  }, [date]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Trial Balance</h2>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">As of:</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-[200px] pl-3 text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  {date ? format(date, "PPP") : <span>Pick a date</span>}
                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(newDate) => newDate && setDate(newDate)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4">
        {Object.entries(summary.byType).map(([type, totals]) => (
          <div key={type} className="p-4 bg-muted rounded-lg">
            <div className="text-sm font-medium mb-2">
              {type.replace(/_/g, " ")}
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Debit:</span>
                <span>{formatCurrency(totals.debit)}</span>
              </div>
              <div className="flex justify-between">
                <span>Credit:</span>
                <span>{formatCurrency(totals.credit)}</span>
              </div>
              <div className="flex justify-between font-medium border-t pt-1">
                <span>Net:</span>
                <span>{formatCurrency(totals.debit - totals.credit)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-md border">
        <DataTable
          columns={columns}
          data={accounts}
          searchKey="name"
        />
      </div>

      <div className="flex justify-end gap-8 text-sm">
        <div className="space-y-1">
          <div className="font-medium">Total Debits</div>
          <div className="text-right">{formatCurrency(summary.totalDebit)}</div>
        </div>
        <div className="space-y-1">
          <div className="font-medium">Total Credits</div>
          <div className="text-right">{formatCurrency(summary.totalCredit)}</div>
        </div>
        <div className="space-y-1">
          <div className="font-medium">Difference</div>
          <div className="text-right">
            {formatCurrency(Math.abs(summary.totalDebit - summary.totalCredit))}
          </div>
        </div>
      </div>
    </div>
  );
} 