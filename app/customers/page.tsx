"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Plus } from "lucide-react";
import { columns } from "./columns";
import { CustomerForm } from "./components/customer-form";
import { useToast } from "@/components/ui/use-toast";
import { Customer } from "@prisma/client";
import useSWR from "swr";
import { ColumnDef } from "@tanstack/react-table";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch customers");
  return res.json();
};

export default function CustomersPage() {
  const { data, error, isLoading, mutate } = useSWR<Customer[]>("/api/customers", fetcher);
  const [showForm, setShowForm] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const { toast } = useToast();

  const handleSubmit = async (customerData: Customer) => {
    await mutate();
    setShowForm(false);
    setSelectedCustomer(null);
    toast({
      title: "Success",
      description: `Customer ${customerData.name} has been ${selectedCustomer ? "updated" : "created"}.`,
    });
  };

  const handleCancel = () => {
    setShowForm(false);
    setSelectedCustomer(null);
  };

  const handleEdit = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowForm(true);
  };

  const handleDelete = async (customer: Customer) => {
    if (!confirm(`Are you sure you want to delete ${customer.name}?`)) return;

    try {
      const res = await fetch(`/api/customers/${customer.id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete customer");

      await mutate();
      toast({
        title: "Success",
        description: `Customer ${customer.name} has been deleted.`,
      });
    } catch (error) {
      console.error("Error deleting customer:", error);
      toast({
        title: "Error",
        description: "Failed to delete customer. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (error) {
    return <div>Failed to load customers</div>;
  }

  if (isLoading) {
    return <div>Loading...</div>;
  }

  const tableColumns: ColumnDef<Customer>[] = [
    ...columns,
    {
      id: "actions",
      cell: ({ row }) => {
        const customer = row.original;
        return (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEdit(customer)}
            >
              Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-red-600 hover:text-red-800"
              onClick={() => handleDelete(customer)}
            >
              Delete
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Customers</h1>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Customer
        </Button>
      </div>

      {showForm ? (
        <CustomerForm
          initialData={selectedCustomer || undefined}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      ) : (
        <div className="bg-white/60 backdrop-blur-[2px] border rounded-lg">
          <DataTable
            columns={tableColumns}
            data={data || []}
          />
        </div>
      )}
    </div>
  );
} 