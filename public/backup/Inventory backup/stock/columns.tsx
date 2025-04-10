import { ColumnDef } from "@tanstack/react-table";
import { StockWithInspector } from "@/hooks/use-stock-data";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

export const columns: ColumnDef<StockWithInspector>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "jumboRollNo",
    header: "Jumbo Roll No.",
  },
  {
    accessorKey: "barcodeId",
    header: "Barcode ID",
  },
  {
    accessorKey: "type",
    header: "Type",
  },
  {
    accessorKey: "gsm",
    header: "GSM",
  },
  {
    accessorKey: "width",
    header: "Width (mm)",
  },
  {
    accessorKey: "length",
    header: "Length (mm)",
  },
  {
    accessorKey: "remainingLength",
    header: "Remaining (mm)",
  },
  {
    accessorKey: "weight",
    header: "Weight (kg)",
  },
  {
    accessorKey: "containerNo",
    header: "Container No.",
  },
  {
    accessorKey: "arrivalDate",
    header: "Arrival Date",
    cell: ({ row }) => format(new Date(row.getValue("arrivalDate")), "dd/MM/yyyy"),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      return (
        <Badge variant={status === "AVAILABLE" ? "default" : "secondary"}>
          {status}
        </Badge>
      );
    },
  },
  {
    accessorKey: "inspector",
    header: "Inspector",
    cell: ({ row }) => row.original.inspector?.name || "-",
  },
]; 