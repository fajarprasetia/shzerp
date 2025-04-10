"use client";

import { useEffect, useState, useMemo } from "react";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { withPermission } from "@/app/components/with-permission";
import { PermissionGate } from "@/app/components/permission-gate";
import { useTranslation } from "react-i18next";
import i18nInstance from "@/app/i18n";
import { getColumns, OrderViewDialog } from "./columns";
import { I18nProvider } from './components/i18n-provider';

// Update interface to match OrderWithRelations in columns.tsx
interface OrderWithCustomer {
  id: string;
  orderNo: string;
  customerId: string;
  sales: string;
  type: string;
  totalAmount: number;
  tax: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  customer: {
    name: string;
    company: string;
  };
  orderItems: any[];
  note: string | null;
  paymentStatus: string | null;
  paymentImage: string | null;
  paymentMethod: string | null;
  reference: string | null;
  journalEntryId: string | null;
}

interface OrderFormProps {
  initialData?: OrderWithCustomer;
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
}

function OrdersPage() {
  const [orders, setOrders] = useState<OrderWithCustomer[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderWithCustomer | null>(null);
  const [viewingOrder, setViewingOrder] = useState<OrderWithCustomer | null>(null);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation(undefined, { i18n: i18nInstance });
  const [mounted, setMounted] = useState(false);

  const handleEditOrder = async (order: OrderWithCustomer) => {
    try {
      // Fetch the full order data including all relations
      const response = await fetch(`/api/sales/orders/${order.id}`);
      if (!response.ok) throw new Error("Failed to fetch order details");
      const orderData = await response.json();
      setSelectedOrder(orderData);
      setShowForm(true);
    } catch (error) {
      console.error("Error fetching order details:", error);
      toast({
        title: t('common.error', 'Error'),
        description: t('sales.orders.fetchError', 'Failed to fetch order details'),
        variant: "destructive",
      });
    }
  };

  const handleViewOrder = async (order: OrderWithCustomer) => {
    try {
      // Fetch the full order data including all relations
      const response = await fetch(`/api/sales/orders/${order.id}`);
      if (!response.ok) throw new Error("Failed to fetch order details");
      const orderData = await response.json();
      setViewingOrder(orderData);
      setShowViewDialog(true);
    } catch (error) {
      console.error("Error fetching order details:", error);
      toast({
        title: t('common.error', 'Error'),
        description: t('sales.orders.fetchError', 'Failed to fetch order details'),
        variant: "destructive",
      });
    }
  };

  const handleNewOrder = () => {
    setSelectedOrder(null);
    setShowForm(true);
  };
  
  const columns: ColumnDef<OrderWithCustomer>[] = useMemo(() => 
    getColumns(t, toast, handleEditOrder, handleViewOrder), 
    [t, toast, handleEditOrder, handleViewOrder]
  );

  useEffect(() => {
    setMounted(true);
    fetchOrders();
  }, []);

  const handleFormSubmit = async (data: any) => {
    try {
      const url = selectedOrder 
        ? `/api/sales/orders/${selectedOrder.id}`
        : '/api/sales/orders';
        
      console.log('[handleFormSubmit] Submitting order:', {
        url,
        method: selectedOrder ? 'PUT' : 'POST',
        data
      });

      const response = await fetch(url, {
        method: selectedOrder ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const responseData = await response.json();
      console.log('[handleFormSubmit] API response:', {
        status: response.status,
        data: responseData
      });

      if (!response.ok) {
        throw new Error(
          responseData.details || 
          responseData.error || 
          `Failed to save order: ${response.status}`
        );
      }

      toast({
        title: t('common.success', 'Success'),
        description: selectedOrder 
          ? t('sales.orders.updateSuccess', 'Order updated successfully')
          : t('sales.orders.createSuccess', 'Order created successfully'),
      });

      setShowForm(false);
      setSelectedOrder(null);
      fetchOrders();
    } catch (error) {
      console.error('[handleFormSubmit] Error:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });

      toast({
        title: t('common.error', 'Error'),
        description: error instanceof Error 
          ? error.message 
          : t('sales.orders.saveError', 'Failed to save order'),
        variant: "destructive",
      });
    }
  };

  const fetchOrders = async () => {
    try {
      const response = await fetch("/api/sales/orders");
      if (!response.ok) throw new Error("Failed to fetch orders");
      const data = await response.json();
      setOrders(data);
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast({
        title: t('common.error', 'Error'),
        description: t('sales.orders.fetchError', 'Failed to fetch orders'),
        variant: "destructive",
      });
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
        title: t('common.success', 'Success'),
        description: t('sales.orders.journalEntrySuccess', 'Journal entry created successfully'),
      });
      
      fetchOrders();
    } catch (error) {
      console.error('Error creating journal entry:', error);
      toast({
        title: t('common.error', 'Error'),
        description: error instanceof Error 
          ? error.message 
          : t('sales.orders.journalEntryError', 'Failed to create journal entry'),
        variant: "destructive",
      });
    }
  };

  // Return a loading placeholder while mounting to avoid hydration issues
  if (!mounted) {
    return <div className="container mx-auto py-10">{t('common.loading', 'Loading...')}</div>;
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">{t('sales.orders.title', 'Order Management')}</h1>
        <Button onClick={handleNewOrder}>
          <Plus className="mr-2 h-4 w-4" />
          {t('sales.orders.addNew', 'Add New Order')}
        </Button>
      </div>

      <DataTable 
        columns={columns}
        data={orders} 
      />

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {selectedOrder 
                ? t('sales.orders.editOrder', 'Edit Order') 
                : t('sales.orders.newOrder', 'New Order')}
            </DialogTitle>
          </DialogHeader>
          <OrderForm
            key={selectedOrder?.id || 'new'} // Force re-render when switching between new/edit
            initialData={selectedOrder || undefined}
            onSubmit={handleFormSubmit}
            onCancel={() => {
              setShowForm(false);
              setSelectedOrder(null);
            }}
          />
        </DialogContent>
      </Dialog>

      <OrderViewDialog
        order={viewingOrder}
        open={showViewDialog}
        onOpenChange={setShowViewDialog}
        t={t}
      />
    </div>
  );
}

// Wrap the exported component with I18nProvider
export default withPermission(
  function WrappedOrdersPage(props: any) {
    return (
      <I18nProvider>
        <OrdersPage {...props} />
      </I18nProvider>
    );
  },
  "sales",
  "read"
); 