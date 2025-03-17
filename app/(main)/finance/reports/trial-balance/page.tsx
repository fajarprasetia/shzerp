"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, FileText, FileSpreadsheet } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  TrialBalanceRow, 
  TrialBalanceData 
} from "@/types/finance";
import { useToast } from "@/components/ui/use-toast";

export default function TrialBalancePage() {
  const [date, setDate] = useState<Date>(new Date());
  const [data, setData] = useState<TrialBalanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<'pdf' | 'excel' | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchTrialBalance();
  }, [date]);

  const fetchTrialBalance = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/finance/reports/trial-balance?date=${date.toISOString()}`
      );
      if (!response.ok) throw new Error("Failed to fetch trial balance");
      const data: TrialBalanceData = await response.json();
      setData(data);
    } catch (error) {
      console.error("Error fetching trial balance:", error);
      toast({
        title: "Error",
        description: "Failed to fetch trial balance data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (type: 'pdf' | 'excel') => {
    if (!data) return;

    try {
      setExporting(type);
      const response = await fetch(
        `/api/finance/reports/trial-balance/export?type=${type}&date=${date.toISOString()}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        }
      );

      if (!response.ok) throw new Error(`Failed to export trial balance as ${type.toUpperCase()}`);

      // Get the filename from the response headers
      const contentDisposition = response.headers.get('content-disposition');
      const filename = contentDisposition
        ? contentDisposition.split('filename=')[1].replace(/"/g, '')
        : `trial-balance-${format(date, 'yyyy-MM-dd')}.${type}`;

      // Convert response to blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: `Trial balance exported as ${type.toUpperCase()}`,
      });
    } catch (error) {
      console.error(`Error exporting trial balance as ${type}:`, error);
      toast({
        title: "Error",
        description: `Failed to export trial balance as ${type.toUpperCase()}`,
        variant: "destructive",
      });
    } finally {
      setExporting(null);
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-10 w-[250px]" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Trial Balance</h1>
        <div className="flex items-center gap-4">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[250px] justify-start text-left font-normal",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(newDate) => newDate && setDate(newDate)}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <Button
            variant="outline"
            onClick={() => handleExport('pdf')}
            disabled={!data || exporting !== null}
          >
            <FileText className="mr-2 h-4 w-4" />
            {exporting === 'pdf' ? 'Exporting...' : 'Export PDF'}
          </Button>

          <Button
            variant="outline"
            onClick={() => handleExport('excel')}
            disabled={!data || exporting !== null}
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            {exporting === 'excel' ? 'Exporting...' : 'Export Excel'}
          </Button>
        </div>
      </div>

      {data && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Account Balances</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.accounts.map((account: TrialBalanceRow) => (
                    <TableRow key={account.id}>
                      <TableCell>{account.code}</TableCell>
                      <TableCell>{account.name}</TableCell>
                      <TableCell>{account.type}</TableCell>
                      <TableCell className="text-right">
                        {formatAmount(account.debit)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatAmount(account.credit)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-bold">
                    <TableCell colSpan={3}>Total</TableCell>
                    <TableCell className="text-right">
                      {formatAmount(data.summary.totalDebit)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatAmount(data.summary.totalCredit)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Object.entries(data.summary.byType).map(([type, totals]) => (
              <Card key={type}>
                <CardHeader>
                  <CardTitle>{type.replace(/_/g, " ")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Debit</p>
                      <p className="text-2xl font-bold">
                        {formatAmount(totals.debit)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Credit</p>
                      <p className="text-2xl font-bold">
                        {formatAmount(totals.credit)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
} 