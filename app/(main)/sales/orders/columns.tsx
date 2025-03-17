import { ColumnDef } from "@tanstack/react-table";
import { Order } from "@prisma/client";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface OrderWithRelations {
  id: string;
  orderNo: string;
  customerId: string;
  sales: string;
  type: string;
  totalAmount: number;
  totalPrice: number;
  tax: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  customer: {
    name: string;
    company: string;
  };
  orderItems: {
    id: string;
    price: number;
    total: number;
  }[];
}

export const columns: ColumnDef<OrderWithRelations>[] = [
  {
    accessorKey: "orderNo",
    header: "Order No.",
    cell: ({ row }) => {
      const order = row.original;
      return (
        <Button
          variant="ghost"
          className="hover:bg-transparent hover:underline"
          onClick={() => {
            // Handle view details
          }}
        >
          <Eye className="h-4 w-4 mr-2" />
          {order.orderNo}
        </Button>
      );
    },
  },
  {
    accessorKey: "customer",
    header: "Customer",
    cell: ({ row }) => `${row.original.customer.name} - ${row.original.customer.company}`,
  },
  {
    accessorKey: "sales",
    header: "Sales",
  },
  {
    accessorKey: "type",
    header: "Type",
  },
  {
    id: "itemCount",
    header: "Order",
    cell: ({ row }) => row.original.orderItems.length,
  },
  {
    accessorKey: "totalAmount",
    header: "Total Amount",
    cell: ({ row }) => new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
    }).format(row.original.totalAmount),
  },
  {
    accessorKey: "totalPrice",
    header: "Total Price",
    cell: ({ row }) => new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
    }).format(row.original.totalPrice),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      const variant = {
        PENDING: "warning",
        PROCESSING: "default",
        COMPLETED: "success",
        CANCELLED: "destructive",
      }[status] || "default";

      return (
        <Badge variant={variant as any}>
          {status}
        </Badge>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => {
                // Handle view details
              }}
            >
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                // Handle edit
              }}
            >
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-red-600"
              onClick={() => {
                // Handle delete
              }}
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
]; 