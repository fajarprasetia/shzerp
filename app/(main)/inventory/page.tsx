"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { StockForm } from "./components/stock-form";
import { useStockData } from "@/hooks/use-stock-data";
import { DataTable } from "@/components/ui/data-table";
import { PlusIcon } from "lucide-react";

const stockColumns = [
  { accessorKey: "jumboRollNo", header: "Jumbo Roll No." },
  { accessorKey: "type", header: "Type" },
  { accessorKey: "gsm", header: "GSM" },
  { accessorKey: "width", header: "Width (mm)" },
  { accessorKey: "length", header: "Length (m)" },
  { accessorKey: "weight", header: "Weight (kg)" },
  { accessorKey: "containerNo", header: "Container No." },
  { accessorKey: "arrivalDate", header: "Arrival Date" },
  {
    accessorKey: "inspected",
    header: "Inspected",
    cell: ({ row }) => (row.getValue("inspected") ? "Yes" : "No"),
  },
];

export default function InventoryPage() {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const { data: stockData, mutate: mutateStock } = useStockData();

  const handleSuccess = () => {
    setAddDialogOpen(false);
    mutateStock();
  };

  return (
    <div className="container mx-auto py-10">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Stock Inventory</h1>
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusIcon className="w-4 h-4 mr-2" />
              Add Stock
            </Button>
          </DialogTrigger>
          <DialogContent>
            <StockForm onSuccess={handleSuccess} />
          </DialogContent>
        </Dialog>
      </div>

      <DataTable
        columns={stockColumns}
        data={stockData || []}
        searchKey="jumboRollNo"
      />
    </div>
  );
} 