"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "../utils/format-currency";
import { Skeleton } from "@/components/ui/skeleton";
import { PermissionGate } from "@/app/components/permission-gate";
import { format } from "date-fns";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Eye } from "lucide-react";
import { useState } from "react";
import { OrderViewDialog } from "../../sales/orders/columns";
import { Button } from "@/components/ui/button";

interface OrderTransaction {
  id: string;
  orderNo: string;
  customer: { name: string; company: string };
  type: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  orderItems: any[];
  discount: number | null;
  discountType: string | null;
  // ...other fields as needed
}

interface RecentTransactionsProps {
  transactions: OrderTransaction[];
  isLoading: boolean;
}

export function RecentTransactions({
  transactions,
  isLoading,
}: RecentTransactionsProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const [viewingOrder, setViewingOrder] = useState<OrderTransaction | null>(null);
  const [showDialog, setShowDialog] = useState(false);

  // Limit to 5 most recent
  const recentOrders = (transactions || []).slice(0, 5);

  return (
    <PermissionGate resource="finance" action="read">
      <Card className="col-span-full">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t('dashboard.transactions.recentTransactions')}</CardTitle>
          <Button variant="outline" size="sm" onClick={() => router.push('/sales/orders')}>
            {t('dashboard.transactions.viewAll', 'View All')}
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
          ) : recentOrders && recentOrders.length > 0 ? (
            <div className="divide-y">
              {recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between py-2 cursor-pointer hover:bg-accent/30 rounded transition"
                  onClick={() => { setViewingOrder(order); setShowDialog(true); }}
                >
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <Eye className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate font-medium text-sm">{order.orderNo}</span>
                      <span className="text-xs text-muted-foreground truncate">{order.customer.name} - {order.customer.company}</span>
                    </div>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">{order.type}</Badge>
                      <Badge variant={order.status === 'COMPLETED' ? 'success' : order.status === 'PENDING' ? 'warning' : 'default'} className="text-xs">
                        {t(`sales.orders.statuses.${order.status.toLowerCase()}`, order.status)}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="font-semibold text-sm">{new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(order.totalAmount)}</span>
                    <span className="text-xs text-muted-foreground">{t('dashboard.transactions.date', 'Date')}: {format(new Date(order.createdAt), 'PPP')}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t('dashboard.transactions.noTransactions')}</p>
          )}
        </CardContent>
        <OrderViewDialog order={viewingOrder} open={showDialog} onOpenChange={setShowDialog} t={t} />
      </Card>
    </PermissionGate>
  );
} 