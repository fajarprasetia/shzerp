"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Plus, MoreVertical } from "lucide-react";
import { format } from "date-fns";
import { ColumnDef } from "@tanstack/react-table";
import { Order, OrderItem } from "@prisma/client";
import { useToast } from "@/components/ui/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { OrderForm } from "./components/order-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { withPermission } from "@/app/components/with-permission";
import { PermissionGate } from "@/app/components/permission-gate";
import Link from "next/link";

interface OrderWithCustomer extends Order {
  customer: {
    name: string;
  };
  orderItems: OrderItem[];
  status?: "pending" | "completed" | "cancelled";
  journalEntryId?: string | null;
}

function OrdersPage() {
  const [orders, setOrders] = useState<OrderWithCustomer[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderWithCustomer | null>(null);
  const { toast } = useToast();

  // Add state for account setup
  const [isSettingUpAccounts, setIsSettingUpAccounts] = useState(false);

  const fetchOrders = async () => {
    try {
      const response = await fetch("/api/sales/orders");
      if (!response.ok) throw new Error("Failed to fetch orders");
      const data = await response.json();
      setOrders(data);
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast({
        title: "Error",
        description: "Failed to fetch orders",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleSetupAccounts = async () => {
    try {
      setIsSettingUpAccounts(true);
      const response = await fetch('/api/finance/setup-accounts');
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to set up accounts');
      }
      
      const result = await response.json();
      
      toast({
        title: "Success",
        description: result.message,
      });
    } catch (error) {
      console.error('Error setting up accounts:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to set up accounts",
        variant: "destructive",
      });
    } finally {
      setIsSettingUpAccounts(false);
    }
  };

  const handleCreateJournalEntry = async (orderId: string) => {
    try {
      const response = await fetch(`/api/sales/orders/${orderId}/journal-entry`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create journal entry');
      }
      
      toast({
        title: "Success",
        description: "Journal entry created successfully",
      });
      
      fetchOrders();
    } catch (error) {
      console.error('Error creating journal entry:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create journal entry",
        variant: "destructive",
      });
    }
  };

  const columns: ColumnDef<OrderWithCustomer>[] = [
    {
      accessorKey: "orderNo",
      header: "Order No",
    },
    {
      accessorKey: "customer.name",
      header: "Customer",
    },
    {
      accessorKey: "totalAmount",
      header: "Total",
      cell: ({ row }) => {
        const amount = parseFloat(row.getValue("totalAmount"));
        const formatted = new Intl.NumberFormat("id-ID", {
          style: "currency",
          currency: "IDR",
        }).format(amount);
        return formatted;
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        return (
          <Badge
            variant={
              status === "completed"
                ? "success"
                : status === "cancelled"
                ? "destructive"
                : "default"
            }
          >
            {status || "pending"}
          </Badge>
        );
      },
    },
    {
      accessorKey: "createdAt",
      header: "Created At",
      cell: ({ row }) => format(new Date(row.getValue("createdAt")), "dd/MM/yyyy"),
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const order = row.original;

        const handleDelete = async () => {
          try {
            const response = await fetch(`/api/sales/orders/${order.id}`, {
              method: 'DELETE',
            });
            
            if (!response.ok) {
              const error = await response.json();
              throw new Error(error.message || 'Failed to delete order');
            }
            
            toast({
              title: "Success",
              description: "Order deleted successfully",
            });
            
            fetchOrders();
          } catch (error) {
            console.error('Error deleting order:', error);
            toast({
              title: "Error",
              description: error instanceof Error ? error.message : "Failed to delete order",
              variant: "destructive",
            });
          }
        };

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
                  setSelectedOrder(order);
                  setShowForm(true);
                }}
              >
                Edit
              </DropdownMenuItem>
              {!order.journalEntryId && (
                <DropdownMenuItem
                  onClick={() => handleCreateJournalEntry(order.id)}
                >
                  Create Journal Entry
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={handleDelete}
                className="text-destructive"
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <div className="container mx-auto py-4 px-2 sm:px-4 sm:py-6 lg:px-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <h1 className="text-xl sm:text-2xl font-bold">Orders</h1>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={handleSetupAccounts}
            disabled={isSettingUpAccounts}
          >
            {isSettingUpAccounts ? (
              <>
                <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-b-transparent"></span>
                Setting up...
              </>
            ) : (
              'Setup Accounts'
            )}
          </Button>
          <Button asChild>
            <Link href="/sales/orders/new">
              <Plus className="h-4 w-4 mr-2" />
              New Order
            </Link>
          </Button>
        </div>
      </div>

      <Dialog 
        open={showForm} 
        onOpenChange={(open) => {
          if (!open) {
            setSelectedOrder(null);
          }
          setShowForm(open);
        }}
      >
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {selectedOrder ? "Edit Order" : "Create New Order"}
            </DialogTitle>
          </DialogHeader>
          <OrderForm
            initialData={selectedOrder}
            onSuccess={() => {
              setShowForm(false);
              setSelectedOrder(null);
              fetchOrders();
            }}
            onCancel={() => {
              setShowForm(false);
              setSelectedOrder(null);
            }}
          />
        </DialogContent>
      </Dialog>

      <div className="rounded-lg border bg-card">
        <DataTable
          columns={columns}
          data={orders}
          searchKey="orderNo"
        />
      </div>
    </div>
  );
}

export default withPermission(OrdersPage, "sales.orders", "read"); 