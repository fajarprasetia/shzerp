"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DataTable } from "@/components/ui/data-table";
import { MoreVertical, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ColumnDef } from "@tanstack/react-table";
import { Customer } from "@prisma/client";
import { useToast } from "@/components/ui/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CustomerForm } from "../components/customer-form";
import { useCustomerData } from "../hooks/use-customer-data";
import { withPermission } from "@/app/components/with-permission";

export default withPermission(CustomersPage, "sales", "read");

function CustomersPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const { data: customers, isLoading, mutate } = useCustomerData();
  const { toast } = useToast();

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/customers/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete customer");
      }

      toast({
        title: "Customer deleted",
        description: "The customer has been deleted successfully",
      });

      mutate();
    } catch (error) {
      console.error("Error deleting customer:", error);
      toast({
        title: "Error",
        description: "Failed to delete customer",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsDialogOpen(true);
  };

  const handleSubmit = async (data: any) => {
    try {
      const url = selectedCustomer
        ? `/api/customers/${selectedCustomer.id}`
        : "/api/customers";
      const method = selectedCustomer ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`Failed to ${selectedCustomer ? "update" : "create"} customer`);
      }

      toast({
        title: `Customer ${selectedCustomer ? "updated" : "created"}`,
        description: `The customer has been ${selectedCustomer ? "updated" : "created"} successfully`,
      });

      setIsDialogOpen(false);
      setSelectedCustomer(null);
      mutate();
    } catch (error) {
      console.error(`Error ${selectedCustomer ? "updating" : "creating"} customer:`, error);
      toast({
        title: "Error",
        description: `Failed to ${selectedCustomer ? "update" : "create"} customer`,
        variant: "destructive",
      });
    }
  };

  const columns: ColumnDef<Customer>[] = [
    {
      accessorKey: "name",
      header: "Name",
    },
    {
      accessorKey: "email",
      header: "Email",
    },
    {
      accessorKey: "phone",
      header: "Phone",
    },
    {
      accessorKey: "address",
      header: "Address",
    },
    {
      accessorKey: "createdAt",
      header: "Created At",
      cell: ({ row }) => {
        const date = row.original.createdAt;
        return date ? format(new Date(date), "PPP") : "N/A";
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const customer = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleEdit(customer)}>
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => handleDelete(customer.id)}
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
    <div className="container mx-auto py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Customers</h1>
        <Button onClick={() => {
          setSelectedCustomer(null);
          setIsDialogOpen(true);
        }}>
          <Plus className="mr-2 h-4 w-4" />
          Add Customer
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={customers || []}
        isLoading={isLoading}
      />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {selectedCustomer ? "Edit Customer" : "Add Customer"}
            </DialogTitle>
          </DialogHeader>
          <CustomerForm
            initialData={selectedCustomer}
            onSubmit={handleSubmit}
            onCancel={() => setIsDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
} 