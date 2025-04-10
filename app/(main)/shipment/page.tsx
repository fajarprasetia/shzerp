'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Truck, History, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ServerPermissionGate } from '@/app/components/server-permission-gate';
import { useTranslation } from 'react-i18next';
import i18nInstance from '@/app/i18n';
import { useState, useEffect } from 'react';

export default function ShipmentPage() {
  const router = useRouter();
  const { t } = useTranslation(undefined, { i18n: i18nInstance });
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleOrdersToShipClick = () => {
    router.push('/shipment/orders');
  };

  const handleShippingHistoryClick = () => {
    router.push('/shipment/history');
  };

  // Return a loading placeholder while mounting to avoid hydration issues
  if (!mounted) {
    return <div className="container mx-auto py-6">{t('common.loading', 'Loading...')}</div>;
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">{t('sales.shipment.title', 'Shipment Management')}</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card
          className="hover:shadow-lg transition-shadow cursor-pointer"
          onClick={handleOrdersToShipClick}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-2xl font-bold">{t('sales.shipment.ordersToShip', 'Orders to Ship')}</CardTitle>
            <Truck className="h-6 w-6 text-primary" />
          </CardHeader>
          <CardContent>
            <CardDescription className="text-base mt-2">
              {t('sales.shipment.ordersToShipDescription', 'View and process pending orders ready for shipment')}
            </CardDescription>
            <Button variant="ghost" className="mt-4 w-full justify-between" onClick={handleOrdersToShipClick}>
              {t('sales.shipment.manageShipments', 'Manage Shipments')} <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        <Card
          className="hover:shadow-lg transition-shadow cursor-pointer"
          onClick={handleShippingHistoryClick}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-2xl font-bold">{t('sales.shipment.shippingHistory', 'Shipping History')}</CardTitle>
            <History className="h-6 w-6 text-primary" />
          </CardHeader>
          <CardContent>
            <CardDescription className="text-base mt-2">
              {t('sales.shipment.shippingHistoryDescription', 'View completed shipments and track shipping history')}
            </CardDescription>
            <Button variant="ghost" className="mt-4 w-full justify-between" onClick={handleShippingHistoryClick}>
              {t('sales.shipment.viewHistory', 'View History')} <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 