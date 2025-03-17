"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { JournalEntryForm } from "./journal-entry-form";
import { useToast } from "@/components/ui/use-toast";
import { JournalEntry, JournalEntryStatus } from "@prisma/client";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/utils";

interface JournalEntriesProps {}

export function JournalEntries({}: JournalEntriesProps) {
  const [showForm, setShowForm] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const { toast } = useToast();
  const [entries, setEntries] = useState<JournalEntry[]>([]);

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
        return status.replace(/_/g, " ");
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const entry = row.original;
        return (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedEntry(entry);
                setShowForm(true);
              }}
              disabled={entry.status !== "DRAFT"}
            >
              Edit
            </Button>
            {entry.status === "DRAFT" && (
              <Button
                variant="default"
                size="sm"
                onClick={() => handlePost(entry.id)}
              >
                Post
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  const handleSubmit = async (entryData: Partial<JournalEntry>) => {
    try {
      const response = await fetch(
        selectedEntry
          ? `/api/finance/journal-entries/${selectedEntry.id}`
          : "/api/finance/journal-entries",
        {
          method: selectedEntry ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(entryData),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to save journal entry");
      }

      const savedEntry = await response.json();

      setEntries((prev) =>
        selectedEntry
          ? prev.map((entry) =>
              entry.id === savedEntry.id ? savedEntry : entry
            )
          : [...prev, savedEntry]
      );

      toast({
        title: "Success",
        description: `Journal entry ${savedEntry.entryNo} has been ${
          selectedEntry ? "updated" : "created"
        }.`,
      });

      setShowForm(false);
      setSelectedEntry(null);
    } catch (error) {
      console.error("Error saving journal entry:", error);
      toast({
        title: "Error",
        description: "Failed to save journal entry. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handlePost = async (id: string) => {
    try {
      const response = await fetch(`/api/finance/journal-entries/${id}/post`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to post journal entry");
      }

      const updatedEntry = await response.json();

      setEntries((prev) =>
        prev.map((entry) =>
          entry.id === updatedEntry.id ? updatedEntry : entry
        )
      );

      toast({
        title: "Success",
        description: `Journal entry ${updatedEntry.entryNo} has been posted.`,
      });
    } catch (error) {
      console.error("Error posting journal entry:", error);
      toast({
        title: "Error",
        description: "Failed to post journal entry. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Journal Entries</h2>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Entry
        </Button>
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedEntry ? "Edit Journal Entry" : "Create New Journal Entry"}
            </DialogTitle>
          </DialogHeader>
          <JournalEntryForm
            initialData={selectedEntry}
            onSubmit={handleSubmit}
            onCancel={() => {
              setShowForm(false);
              setSelectedEntry(null);
            }}
          />
        </DialogContent>
      </Dialog>

      <div className="rounded-md border">
        <DataTable
          columns={columns}
          data={entries}
          searchKey="entryNo"
        />
      </div>
    </div>
  );
} 