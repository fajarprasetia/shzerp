"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Plus } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { Order, Customer, Stock } from "@prisma/client";
import { OrderDetailsModal } from "./order-details-modal";
import { useOrderFinance } from "@/hooks/use-order-finance";

interface OrderWithRelations extends Order {
  customer: Customer;
  orderItems: Array<{
    id: string;
    stock: Stock;
    price: number;
    total: number;
  }>;
}

interface OrderListProps {
  initialOrders: OrderWithRelations[];
}

const columns = [
  {
    id: "orderNo",
    header: "Order No",
    accessorKey: "orderNo",
    cell: ({ row }: { row: any }) => {
      const order = row.original;
      return (
        <Button
          variant="ghost"
          className="px-0 font-normal hover:underline"
          onClick={() => row.toggleSelected()}
        >
          {order.orderNo}
        </Button>
      );
    },
  },
  {
    id: "customer",
    header: "Customer",
    accessorKey: "customer.name",
  },
  {
    id: "type",
    header: "Type",
    accessorKey: "type",
  },
  {
    id: "totalAmount",
    header: "Total Amount",
    accessorKey: "totalAmount",
  },
  {
    id: "totalPrice",
    header: "Total Price",
    accessorKey: "totalAmount",
    cell: ({ row }: { row: any }) => {
      return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
      }).format(row.original.totalAmount);
    },
  },
  {
    id: "status",
    header: "Status",
    accessorKey: "status",
  },
  {
    id: "actions",
    header: "Actions",
  },
];

export function OrderList({ initialOrders }: OrderListProps) {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderWithRelations[]>(initialOrders);
  const { toast } = useToast();
  const [selectedOrder, setSelectedOrder] = useState<OrderWithRelations | null>(null);
  const { deleteOrderTransaction } = useOrderFinance();

  const handleDelete = async (order: OrderWithRelations) => {
    if (!confirm(`Are you sure you want to delete order ${order.orderNo}?`)) return;

    try {
      // Delete the financial transaction first
      await deleteOrderTransaction(order.id);

      // Then delete the order
      const res = await fetch(`/api/sales/orders?id=${order.id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete order");

      setOrders(orders.filter(o => o.id !== order.id));
      toast({
        title: "Success",
        description: `Order ${order.orderNo} has been deleted.`,
      });
    } catch (error) {
      console.error("Error deleting order:", error);
      toast({
        title: "Error",
        description: "Failed to delete order. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Orders</h1>
        <Button onClick={() => router.push("/sales/orders")}>
          <Plus className="h-4 w-4 mr-2" />
          Add Order
        </Button>
      </div>

      <div className="bg-white/60 backdrop-blur-[2px] border rounded-lg">
        <DataTable
          columns={columns.map(col => {
            if (col.id === "actions") {
              return {
                ...col,
                cell: ({ row }: { row: any }) => {
                  const order = row.original;
                  return (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/sales/orders/${order.id}`)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-800"
                        onClick={() => handleDelete(order)}
                      >
                        Delete
                      </Button>
                    </div>
                  );
                },
              };
            }
            return col;
          })}
          data={orders}
          onRowSelectionChange={(selection: any) => {
            const selectedIndex = selection.values().next().value;
            setSelectedOrder(selectedIndex !== undefined ? orders[selectedIndex] : null);
          }}
        />
      </div>

      <OrderDetailsModal
        order={selectedOrder}
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
      />
    </div>
  );
} 