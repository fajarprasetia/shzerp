"use client";

import { useEffect, useState } from "react";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, FileText } from "lucide-react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { JournalEntryForm } from "@/app/finance/transactions/components/journal-entry-form";

type JournalEntryStatus = "DRAFT" | "POSTED" | "CANCELLED";

interface JournalEntryItem {
  id: string;
  accountId: string;
  debit: number;
  credit: number;
  description?: string | null;
  account: {
    id: string;
    code: string;
    name: string;
    type: string;
  };
}

interface JournalEntry {
  id: string;
  entryNo: string;
  date: Date;
  description: string;
  reference?: string | null;
  status: JournalEntryStatus;
  totalDebit: number;
  totalCredit: number;
  createdAt: Date;
  items: JournalEntryItem[];
}

export default function JournalEntriesPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchEntries = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/finance/journal-entries");
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch journal entries");
      }
      
      const data = await response.json();
      setEntries(data);
    } catch (error) {
      console.error("Error fetching journal entries:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch journal entries",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, []);

  const columns: ColumnDef<JournalEntry>[] = [
    {
      accessorKey: "entryNo",
      header: "Entry No",
    },
    {
      accessorKey: "date",
      header: "Date",
      cell: ({ row }) => format(new Date(row.getValue("date")), "dd/MM/yyyy"),
    },
    {
      accessorKey: "description",
      header: "Description",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as JournalEntryStatus;
        return (
          <Badge
            variant={
              status === "POSTED"
                ? "success"
                : status === "DRAFT"
                ? "default"
                : "destructive"
            }
          >
            {status.replace(/_/g, " ")}
          </Badge>
        );
      },
    },
    {
      accessorKey: "totalDebit",
      header: "Total Debit",
      cell: ({ row }) => {
        const amount = parseFloat(row.getValue("totalDebit"));
        return new Intl.NumberFormat("id-ID", {
          style: "currency",
          currency: "IDR",
        }).format(amount);
      },
    },
    {
      accessorKey: "totalCredit",
      header: "Total Credit",
      cell: ({ row }) => {
        const amount = parseFloat(row.getValue("totalCredit"));
        return new Intl.NumberFormat("id-ID", {
          style: "currency",
          currency: "IDR",
        }).format(amount);
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const entry = row.original;
        return (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedEntry(entry)}
            disabled={entry.status === "POSTED"}
          >
            <FileText className="h-4 w-4" />
          </Button>
        );
      },
    },
  ];

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Journal Entries</h2>
          <p className="text-muted-foreground">
            View and manage all journal entries including those from orders
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Entry
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-24">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={entries}
          searchKey="entryNo"
        />
      )}

      <Dialog
        open={showForm || !!selectedEntry}
        onOpenChange={(open) => {
          if (!open) {
            setShowForm(false);
            setSelectedEntry(null);
          }
        }}
      >
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {selectedEntry ? "View Journal Entry" : "Create Journal Entry"}
            </DialogTitle>
          </DialogHeader>
          <JournalEntryForm
            entry={selectedEntry}
            onSuccess={() => {
              setShowForm(false);
              setSelectedEntry(null);
              fetchEntries();
            }}
            onCancel={() => {
              setShowForm(false);
              setSelectedEntry(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
} 