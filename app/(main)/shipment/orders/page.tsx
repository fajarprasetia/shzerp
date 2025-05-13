"use client";

import { useState, useEffect, useMemo } from "react";
import { Heading } from "@/components/ui";
import { Separator } from "@/components/ui";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Loader2, Package, ScanBarcode, Truck, History } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { useOrders } from "@/app/hooks/use-shipment-orders";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { getColumns } from "./components/columns";
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui';
import { LoadingSpinner } from '@/components/ui';
import { useTranslation } from "react-i18next";
import i18nInstance from "@/app/i18n";

const OrdersToShipPage = () => {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [pageSize, setPageSize] = useState('10');
  const [currentPage, setCurrentPage] = useState(1);
  const [mounted, setMounted] = useState(false);
  const { t } = useTranslation(undefined, { i18n: i18nInstance });
  
  // Memoize the columns to avoid re-creation on each render
  const columns = useMemo(() => getColumns(t), [t]);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Debounce search input
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    
    // Clear any existing timeout
    const timeout = setTimeout(() => {
      setDebouncedSearchQuery(e.target.value);
      setCurrentPage(1); // Reset to first page when search changes
    }, 500);
    
    return () => clearTimeout(timeout);
  };
  
  // Fetch orders data using the custom hook
  const { data, error, isLoading } = useOrders({
    page: currentPage,
    pageSize: parseInt(pageSize),
    search: debouncedSearchQuery,
  });
  
  // Handle pagination change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };
  
  // Handle page size change
  const handlePageSizeChange = (value: string) => {
    setPageSize(value);
    setCurrentPage(1); // Reset to first page when page size changes
  };
  
  // Navigate to process shipment page
  const navigateToProcessShipment = (orderId: string) => {
    router.push(`/shipment/process/${orderId}`);
  };

  // Format data for the table
  const formattedOrders = data?.orders?.map(order => ({
    id: order.id,
    orderNo: order.orderNo,
    customer: order.customer.name,
    customerPhone: order.customer.phone,
    address: order.customer.address || t('sales.shipment.orders.noAddress', 'No address provided'),
    items: order.orderItems.quantity,
    date: format(new Date(order.createdAt), 'MMM dd, yyyy'),
    action: (
      <Button
        variant="outline"
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          navigateToProcessShipment(order.id);
        }}
      >
        <Truck className="mr-2 h-4 w-4" />
        {t('sales.shipment.orders.process', 'Process')}
      </Button>
    )
  })) || [];
  
  // Return a loading placeholder while mounting to avoid hydration issues
  if (!mounted) {
    return <div className="container mx-auto py-6">{t('common.loading', 'Loading...')}</div>;
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('sales.shipment.orders.title', 'Orders to Ship')}</h1>
          <p className="text-muted-foreground">
            {t('sales.shipment.orders.subtitle', 'Process orders that are ready for shipment')}
          </p>
        </div>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            onClick={() => router.push('/shipment/history')}
          >
            <History className="mr-2 h-4 w-4" />
            {t('sales.shipment.history.title', 'Shipment History')}
          </Button>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>{t('sales.shipment.orders.unshippedOrders', 'Unshipped Orders')}</CardTitle>
          <CardDescription>
            {t('sales.shipment.orders.unshippedOrdersDescription', 'Orders that have been paid and are ready to be shipped')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0 mb-4">
            <div className="w-full md:w-1/3">
              <Input
                placeholder={t('sales.shipment.orders.searchPlaceholder', 'Search by order number, customer...')}
                value={searchQuery}
                onChange={handleSearchChange}
              />
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground">{t('common.show', 'Show')}</span>
              <Select
                value={pageSize}
                onValueChange={handlePageSizeChange}
              >
                <SelectTrigger className="w-20">
                  <SelectValue placeholder="10" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">{t('common.perPage', 'per page')}</span>
            </div>
          </div>
          
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <LoadingSpinner size="lg" />
            </div>
          ) : error ? (
            <div className="text-center py-10">
              <p className="text-red-500">{t('sales.shipment.orders.loadError', 'Failed to load orders. Please try again.')}</p>
              <p className="text-sm text-muted-foreground mt-2">{error.message}</p>
            </div>
          ) : (
            <>
              <DataTable 
                columns={columns} 
                data={formattedOrders} 
                onRowClick={(row) => navigateToProcessShipment(row.id)}
                noResults={
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <Package className="h-12 w-12 text-muted-foreground mb-2" />
                    <h3 className="text-lg font-medium">{t('sales.shipment.orders.noOrders', 'No orders to ship')}</h3>
                    <p className="text-muted-foreground">
                      {t('sales.shipment.orders.noOrdersDescription', 'All orders have been processed or there are no paid orders yet.')}
                    </p>
                  </div>
                }
              />
              
              {data?.totalPages && data.totalPages > 1 && (
                <div className="flex items-center justify-end mt-4">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious 
                          onClick={() => currentPage > 1 ? handlePageChange(currentPage - 1) : null}
                          aria-disabled={currentPage === 1}
                          className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                        />
                      </PaginationItem>
                      
                      {/* Generate pagination links */}
                      {Array.from({ length: data.totalPages }, (_, i) => i + 1).map((page) => (
                        <PaginationItem key={page}>
                          <PaginationLink
                            isActive={page === currentPage}
                            onClick={() => handlePageChange(page)}
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      ))}
                      
                      <PaginationItem>
                        <PaginationNext 
                          onClick={() => currentPage < data.totalPages ? handlePageChange(currentPage + 1) : null}
                          aria-disabled={currentPage === data.totalPages}
                          className={currentPage === data.totalPages ? "pointer-events-none opacity-50" : ""}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OrdersToShipPage; 