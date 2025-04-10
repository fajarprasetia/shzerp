"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { DataTable } from "@/components/ui/data-table";
import { MoreVertical, Plus, Trash2, MessageSquare } from "lucide-react";
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
import { useTranslation } from "react-i18next";
import i18nInstance from "@/app/i18n";

interface CustomerTableData {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  whatsapp: string | null;
  company: string | null;
  address: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export default withPermission(CustomersPage, "sales", "read");

function CustomersPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const { data: customers, isLoading, mutate } = useCustomerData();
  const { toast } = useToast();
  const { t } = useTranslation(undefined, { i18n: i18nInstance });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/sales/customer`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id }),
      });

      if (!response.ok) {
        throw new Error("Failed to delete customer");
      }

      toast({
        title: t('common.success', 'Success'),
        description: t('sales.customers.deleteSuccess', 'The customer has been deleted successfully'),
      });

      mutate();
    } catch (error) {
      console.error("Error deleting customer:", error);
      toast({
        title: t('common.error', 'Error'),
        description: t('sales.customers.deleteError', 'Failed to delete customer'),
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
      const method = selectedCustomer ? "PUT" : "POST";
      
      const response = await fetch("/api/sales/customer", {
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
        title: t('common.success', 'Success'),
        description: selectedCustomer 
          ? t('sales.customers.updateSuccess', 'The customer has been updated successfully')
          : t('sales.customers.createSuccess', 'The customer has been created successfully'),
      });

      setIsDialogOpen(false);
      setSelectedCustomer(null);
      mutate();
    } catch (error) {
      console.error("Error submitting customer:", error);
      toast({
        title: t('common.error', 'Error'),
        description: t('sales.customers.errorSaving', 'Failed to save customer'),
        variant: "destructive",
      });
    }
  };

  const columns: ColumnDef<CustomerTableData>[] = [
    {
      accessorKey: "name",
      header: t('sales.customers.name', 'Name'),
    },
    {
      accessorKey: "company",
      header: t('sales.customers.company', 'Company'),
      cell: ({ row }) => row.original.company || "-",
    },
    {
      accessorKey: "phone",
      header: t('sales.customers.phone', 'Phone'),
    },
    {
      accessorKey: "whatsapp",
      header: t('sales.customers.whatsapp', 'WhatsApp'),
      cell: ({ row }) => row.original.whatsapp || "-",
    },
    {
      accessorKey: "email",
      header: t('sales.customers.email', 'Email'),
      cell: ({ row }) => row.original.email || "-",
    },
    {
      accessorKey: "createdAt",
      header: t('sales.customers.createdAt', 'Created At'),
      cell: ({ row }) => format(new Date(row.original.createdAt), "PPP"),
    },
    {
      id: "actions",
      cell: ({ row }) => {
        return (
          <div className="flex items-center gap-2">
            <a
              href={`https://wa.me/${row.original.whatsapp || row.original.phone}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-500 hover:text-green-700"
            >
              <MessageSquare className="h-4 w-4" />
            </a>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">{t('common.actions', 'Open menu')}</span>
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleEdit(row.original as unknown as Customer)}>
                  {t('common.edit', 'Edit')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-red-600"
                  onClick={() => handleDelete(row.original.id)}
                >
                  {t('common.delete', 'Delete')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  // Return a loading placeholder while mounting to avoid hydration issues
  if (!mounted || isLoading) {
    return <div className="container mx-auto py-10">{t('common.loading', 'Loading...')}</div>;
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">{t('sales.customers.title', 'Customer Management')}</h1>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t('sales.customers.addNew', 'Add New Customer')}
        </Button>
      </div>

      <DataTable columns={columns} data={customers || []} />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {selectedCustomer 
                ? t('sales.customers.editCustomer', 'Edit Customer') 
                : t('sales.customers.addNew', 'Add New Customer')}
            </DialogTitle>
            <DialogDescription>
              {selectedCustomer 
                ? t('sales.customers.details', 'Update customer information') 
                : t('sales.customers.details', 'Enter customer details')}
            </DialogDescription>
          </DialogHeader>
          <CustomerForm
            initialData={selectedCustomer}
            onSubmit={handleSubmit}
            onCancel={() => {
              setIsDialogOpen(false);
              setSelectedCustomer(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
} 