"use client";

import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useTranslation } from "react-i18next";
import i18nInstance from "@/app/i18n";

interface OrderDetailsProps {
  order: {
    id: string;
    orderNo: string;
    customerId: string;
    status: string;
    totalAmount: number;
    createdAt: Date;
    updatedAt: Date;
    customer: {
      name: string;
      company: string;
      phone?: string;
      address?: string;
    };
    orderItems: Array<{
      id: string;
      type: string;
      product?: string;
      gsm?: string | number;
      width?: string | number;
      length?: string | number;
      weight?: string | number;
      quantity: number;
      price: number;
      tax: number;
    }>;
    note?: string | null;
  };
}

export function OrderDetails({ order }: OrderDetailsProps) {
  const { t } = useTranslation(undefined, { i18n: i18nInstance });

  // Helper function to format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Helper to calculate the total for an individual item
  const calculateItemTotal = (item: any): number => {
    const price = Number(item.price) || 0;
    const tax = Number(item.tax) || 0;
    const taxMultiplier = 1 + (tax / 100);
    const quantity = Number(item.quantity) || 1;

    let subtotal = 0;

    switch (item.type) {
      case "Sublimation Paper":
        if (item.product === "Jumbo Roll") {
          const weight = Number(item.weight) || 0;
          subtotal = price * weight;
        } else if (item.product === "Roll") {
          const width = Number(item.width) / 100; // Convert to meters
          const length = Number(item.length) || 0;
          subtotal = price * width * length * quantity;
        }
        break;

      case "Protect Paper":
        const protectWeight = Number(item.weight) || 0;
        subtotal = price * protectWeight;
        break;

      case "DTF Film":
      case "Ink":
        subtotal = price * quantity;
        break;
    }

    return subtotal * taxMultiplier;
  };

  // Get status badge variant
  const getStatusVariant = (status: string) => {
    const variants = {
      PENDING: "warning",
      PROCESSING: "default",
      COMPLETED: "success",
      CANCELLED: "destructive",
    };
    return variants[status as keyof typeof variants] || "default";
  };

  return (
    <div className="space-y-6">
      {/* Order Header */}
      <div className="flex flex-col md:flex-row md:justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">
            {t('sales.orders.orderNumber', 'Order')} #{order.orderNo}
          </h3>
          <p className="text-sm text-muted-foreground">
            {t('sales.orders.createdOn', 'Created on')} {format(new Date(order.createdAt), "PPP")}
          </p>
        </div>
        <div className="flex flex-col items-start md:items-end">
          <Badge variant={getStatusVariant(order.status) as any}>
            {t(`sales.orders.statuses.${order.status.toLowerCase()}`, order.status)}
          </Badge>
          <p className="text-sm mt-1">
            {t('sales.orders.lastUpdated', 'Last updated')}: {format(new Date(order.updatedAt), "PPP")}
          </p>
        </div>
      </div>

      <Separator />

      {/* Customer Information */}
      <div>
        <h4 className="text-md font-medium mb-2">{t('sales.orders.customerInformation', 'Customer Information')}</h4>
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium">{t('sales.orders.customerName', 'Name')}</p>
                <p>{order.customer.name}</p>
              </div>
              <div>
                <p className="text-sm font-medium">{t('sales.orders.customerCompany', 'Company')}</p>
                <p>{order.customer.company || '-'}</p>
              </div>
              <div>
                <p className="text-sm font-medium">{t('sales.orders.customerPhone', 'Phone')}</p>
                <p>{order.customer.phone || '-'}</p>
              </div>
              <div>
                <p className="text-sm font-medium">{t('sales.orders.customerAddress', 'Address')}</p>
                <p className="break-words">{order.customer.address || '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Order Items */}
      <div>
        <h4 className="text-md font-medium mb-2">{t('sales.orders.orderItems', 'Order Items')}</h4>
        <div className="space-y-3">
          {order.orderItems.map((item, index) => (
            <Card key={item.id || index}>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm font-medium">{t('sales.orders.productType', 'Product Type')}</p>
                    <p>{item.type} {item.product && `- ${item.product}`}</p>
                    
                    {item.gsm && (
                      <div className="mt-2">
                        <p className="text-sm font-medium">{t('sales.orders.gsm', 'GSM')}</p>
                        <p>{item.gsm}</p>
                      </div>
                    )}
                  </div>
                  
                  <div>
                    {item.width && (
                      <div>
                        <p className="text-sm font-medium">{t('sales.orders.width', 'Width')} (mm)</p>
                        <p>{item.width}</p>
                      </div>
                    )}
                    
                    {item.length && item.product === "Roll" && (
                      <div className="mt-2">
                        <p className="text-sm font-medium">{t('sales.orders.length', 'Length')} (mm)</p>
                        <p>{item.length}</p>
                      </div>
                    )}
                    
                    {item.weight && item.product === "Jumbo Roll" && (
                      <div className="mt-2">
                        <p className="text-sm font-medium">{t('sales.orders.weight', 'Weight')} (kg)</p>
                        <p>{item.weight}</p>
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <div className="flex justify-between">
                      <div>
                        <p className="text-sm font-medium">{t('sales.orders.price', 'Price')}</p>
                        <p>{formatCurrency(item.price)}</p>
                      </div>
                      
                      {item.product === "Roll" && (
                        <div>
                          <p className="text-sm font-medium">{t('sales.orders.quantity', 'Quantity')}</p>
                          <p>{item.quantity}</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="mt-2">
                      <p className="text-sm font-medium">{t('sales.orders.tax', 'Tax')}</p>
                      <p>{item.tax}%</p>
                    </div>
                    
                    <div className="mt-3 pt-2 border-t">
                      <p className="text-sm font-medium">{t('sales.orders.itemTotal', 'Item Total')}</p>
                      <p className="font-semibold">{formatCurrency(calculateItemTotal(item))}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Order Notes */}
      {order.note && (
        <div>
          <h4 className="text-md font-medium mb-2">{t('sales.orders.notes', 'Notes')}</h4>
          <Card>
            <CardContent className="p-4">
              <p className="whitespace-pre-line">{order.note}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Order Summary */}
      <div>
        <Card className="bg-primary/5">
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <h4 className="text-md font-medium">{t('sales.orders.totalAmount', 'Total Amount')}</h4>
              <p className="text-xl font-bold">{formatCurrency(order.totalAmount)}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 