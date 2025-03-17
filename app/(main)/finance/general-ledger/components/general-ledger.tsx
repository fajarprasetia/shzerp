"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, Search, Filter, Download, Plus, ArrowUpDown } from "lucide-react";

interface Account {
  id: string;
  name: string;
  type: string;
  balance: number;
  isAutomated?: boolean;
  lastSynced?: string;
}

export function GeneralLedger() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortColumn, setSortColumn] = useState<string>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [syncing, setSyncing] = useState<string | null>(null);

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/finance/accounts");
      if (!response.ok) {
        throw new Error("Failed to fetch accounts");
      }
      const data = await response.json();
      setAccounts(data);
    } catch (error) {
      console.error("Error fetching accounts:", error);
      toast.error("Failed to load accounts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const handleSync = async (accountId: string) => {
    setSyncing(accountId);
    try {
      const response = await fetch(`/api/finance/accounts/${accountId}/sync`, {
        method: "POST",
      });
      
      if (!response.ok) {
        throw new Error("Failed to sync account");
      }
      
      const data = await response.json();
      
      // Update the account in the local state
      setAccounts(accounts.map(account => 
        account.id === accountId 
          ? { 
              ...account, 
              balance: data.balance,
              lastSynced: new Date().toISOString()
            } 
          : account
      ));
      
      toast.success(`${data.name} synced successfully`);
    } catch (error) {
      console.error("Error syncing account:", error);
      toast.error("Failed to sync account");
    } finally {
      setSyncing(null);
    }
  };

  const filteredAccounts = accounts.filter(account => 
    account.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    account.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedAccounts = [...filteredAccounts].sort((a, b) => {
    if (sortColumn === "balance") {
      return sortDirection === "asc" 
        ? a.balance - b.balance 
        : b.balance - a.balance;
    } else {
      const aValue = a[sortColumn as keyof Account] as string;
      const bValue = b[sortColumn as keyof Account] as string;
      
      return sortDirection === "asc"
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }
  });

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getAccountTypeColor = (type: string) => {
    const typeMap: Record<string, string> = {
      "asset": "bg-blue-100 text-blue-800",
      "liability": "bg-red-100 text-red-800",
      "equity": "bg-green-100 text-green-800",
      "revenue": "bg-emerald-100 text-emerald-800",
      "expense": "bg-amber-100 text-amber-800",
    };
    
    return typeMap[type.toLowerCase()] || "bg-gray-100 text-gray-800";
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>General Ledger</CardTitle>
            <CardDescription>Manage your chart of accounts</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchAccounts}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="default" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              New Account
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between mb-4">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search accounts..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[300px] cursor-pointer" onClick={() => handleSort("name")}>
                    <div className="flex items-center">
                      Account Name
                      {sortColumn === "name" && (
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort("type")}>
                    <div className="flex items-center">
                      Type
                      {sortColumn === "type" && (
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead className="text-right cursor-pointer" onClick={() => handleSort("balance")}>
                    <div className="flex items-center justify-end">
                      Balance
                      {sortColumn === "balance" && (
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedAccounts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      No accounts found.
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedAccounts.map((account) => (
                    <TableRow key={account.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center">
                          {account.name}
                          {account.isAutomated && (
                            <Badge variant="outline" className="ml-2 bg-blue-50">
                              Auto
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getAccountTypeColor(account.type)}>
                          {account.type.charAt(0).toUpperCase() + account.type.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(account.balance)}
                      </TableCell>
                      <TableCell className="text-center">
                        {account.isAutomated ? (
                          <div className="text-xs text-muted-foreground">
                            Last synced: {formatDate(account.lastSynced)}
                          </div>
                        ) : (
                          <Badge variant="outline">Manual</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {account.isAutomated ? (
                            <Button 
                              variant="outline" 
                              size="sm"
                              disabled={syncing === account.id}
                              onClick={() => handleSync(account.id)}
                            >
                              {syncing === account.id ? (
                                <>
                                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                  Syncing...
                                </>
                              ) : (
                                <>
                                  <RefreshCw className="h-4 w-4 mr-2" />
                                  Sync
                                </>
                              )}
                            </Button>
                          ) : (
                            <Button variant="outline" size="sm">
                              Edit
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {filteredAccounts.length} of {accounts.length} accounts
        </div>
        <Button variant="outline" size="sm" onClick={() => {
          const arAccount = accounts.find(a => a.name.toLowerCase().includes("receivable"));
          const apAccount = accounts.find(a => a.name.toLowerCase().includes("payable"));
          
          if (arAccount) {
            handleSync(arAccount.id);
          }
          
          if (apAccount) {
            setTimeout(() => {
              handleSync(apAccount.id);
            }, 1000);
          }
          
          if (!arAccount && !apAccount) {
            toast.error("No AR/AP accounts found to sync");
          } else {
            toast.success("Syncing AR/AP accounts");
          }
        }}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Sync Ledger
        </Button>
      </CardFooter>
    </Card>
  );
} 