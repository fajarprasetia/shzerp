"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { columns } from "./reconciliation-columns";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "@radix-ui/react-icons";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ReconciliationForm } from "./reconciliation-form";
import { Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { EmptyState } from "@/components/empty-state";

interface Reconciliation {
  id: string;
  date: string;
  bankAccountId: string;
  bankAccount: {
    accountName: string;
    currency: string;
  };
  statementBalance: number;
  bookBalance: number;
  difference: number;
  status: "pending" | "completed";
  notes?: string;
}

export function Reconciliation() {
  const [reconciliations, setReconciliations] = useState<Reconciliation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const { toast } = useToast();

  const fetchReconciliations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch("/api/finance/reconciliations", {
        headers: {
          "Cache-Control": "no-cache",
        },
      });
      
      if (!response.ok) {
        if (response.status === 500) {
          console.error("Server error when fetching reconciliations");
          setReconciliations([]);
          toast({
            title: "Server Error",
            description: "The server encountered an error. This might be because the database tables are not yet set up.",
            variant: "destructive",
          });
          return;
        }
        throw new Error(`Error: ${response.status}`);
      }
      
      const data = await response.json();
      setReconciliations(data);
    } catch (error) {
      console.error("Error fetching reconciliations:", error);
      setError("Failed to load reconciliations");
      toast({
        title: "Error",
        description: "Failed to load reconciliations. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchReconciliations();
  }, [fetchReconciliations]);

  const totalDifference = reconciliations?.length 
    ? reconciliations.reduce((sum, r) => sum + r.difference, 0)
    : 0;
    
  const pendingCount = reconciliations?.length 
    ? reconciliations.filter(r => r.status === "pending").length
    : 0;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <EmptyState
          title="Error loading reconciliations"
          description="We encountered a problem while loading your bank reconciliations."
          icon="alertTriangle"
          action={{
            label: "Try Again",
            onClick: fetchReconciliations,
          }}
        />
      </div>
    );
  }

  if (!reconciliations?.length) {
    return (
      <div className="space-y-4">
        <EmptyState
          title="No reconciliations found"
          description="You haven't created any bank reconciliations yet."
          icon="fileCheck"
          action={{
            label: "Create Reconciliation",
            onClick: () => setFormOpen(true),
          }}
        />
        <Dialog open={formOpen} onOpenChange={setFormOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogTitle>Create Bank Reconciliation</DialogTitle>
            <ReconciliationForm 
              onSuccess={() => {
                setFormOpen(false);
                fetchReconciliations();
              }}
            />
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Difference
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalDifference >= 0 ? "text-green-600" : "text-red-600"}`}>
              {new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
              }).format(totalDifference)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Reconciliations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCount}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">Bank Reconciliation</h2>
        <Dialog open={formOpen} onOpenChange={setFormOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusIcon className="mr-2 h-4 w-4" />
              New Reconciliation
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogTitle>Create Bank Reconciliation</DialogTitle>
            <ReconciliationForm onSuccess={() => {
              setFormOpen(false);
              fetchReconciliations();
            }} />
          </DialogContent>
        </Dialog>
      </div>

      <DataTable
        columns={columns}
        data={reconciliations}
        loading={loading}
      />
    </div>
  );
} 