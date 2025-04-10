'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoadingSpinner } from '@/components/ui';
import { Package } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import i18nInstance from '@/app/i18n';

// Shipment types
interface ShipmentItem {
  id: string;
}

interface Shipment {
  id: string;
  orderId: string;
  orderNo: string;
  customerName: string;
  address: string;
  items: ShipmentItem[];
  createdAt: string;
  processedBy: {
    id: string;
    name: string;
  };
}

interface ShipmentHistoryResponse {
  shipments: Shipment[];
  totalPages: number;
  totalItems: number;
}

// Fetcher function for SWR
const fetcher = async (url: string) => {
  const res = await fetch(url);
  
  if (!res.ok) {
    const error = new Error('Failed to fetch shipment history');
    console.error('API Error:', await res.text());
    throw error;
  }
  
  return res.json();
};

export default function ShipmentHistoryPage() {
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState('10');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [mounted, setMounted] = useState(false);
  const { t } = useTranslation(undefined, { i18n: i18nInstance });
  
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
  
  // Fetch shipment history data
  const { data, error, isLoading } = useSWR<ShipmentHistoryResponse>(
    `/api/shipment/history?page=${currentPage}&pageSize=${pageSize}${debouncedSearchQuery ? `&search=${debouncedSearchQuery}` : ''}`,
    fetcher
  );
  
  // Handle pagination change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };
  
  // Handle page size change
  const handlePageSizeChange = (value: string) => {
    setPageSize(value);
    setCurrentPage(1); // Reset to first page when page size changes
  };
  
  // View shipment details
  const viewShipmentDetails = (id: string) => {
    router.push(`/shipment/history/${id}`);
  };
  
  // Log errors for debugging
  if (error) {
    console.error('SWR Error:', error);
  }
  
  // Return a loading placeholder while mounting to avoid hydration issues
  if (!mounted) {
    return <div className="container mx-auto py-6">{t('common.loading', 'Loading...')}</div>;
  }
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('sales.shipment.history.title', 'Shipment History')}</h1>
          <p className="text-muted-foreground">
            {t('sales.shipment.history.subtitle', 'View all processed shipments')}
          </p>
        </div>
        <Button 
          onClick={() => router.push('/shipment/orders')}
        >
          <Package className="mr-2 h-4 w-4" />
          {t('sales.shipment.history.processNewShipment', 'Process New Shipment')}
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>{t('sales.shipment.history.shipments', 'Shipments')}</CardTitle>
          <CardDescription>
            {t('sales.shipment.history.shipmentsDescription', 'A list of all processed shipments')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0 mb-4">
            <div className="w-full md:w-1/3">
              <Input
                placeholder={t('sales.shipment.history.searchPlaceholder', 'Search by order number, customer...')}
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
              <p className="text-red-500">{t('sales.shipment.history.loadError', 'Failed to load shipment history. Please try again.')}</p>
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('sales.shipment.history.shipmentId', 'Shipment ID')}</TableHead>
                      <TableHead>{t('sales.shipment.history.orderNumber', 'Order Number')}</TableHead>
                      <TableHead>{t('sales.shipment.history.customer', 'Customer')}</TableHead>
                      <TableHead>{t('sales.shipment.history.items', 'Items')}</TableHead>
                      <TableHead>{t('sales.shipment.history.processedBy', 'Processed By')}</TableHead>
                      <TableHead>{t('sales.shipment.history.date', 'Date')}</TableHead>
                      <TableHead className="text-right">{t('common.actions', 'Actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data?.shipments && data.shipments.length > 0 ? (
                      data.shipments.map((shipment) => (
                        <TableRow key={shipment.id}>
                          <TableCell className="font-medium">{shipment.id.substring(0, 8)}</TableCell>
                          <TableCell>{shipment.orderNo}</TableCell>
                          <TableCell>{shipment.customerName}</TableCell>
                          <TableCell>{shipment.items?.length || 0}</TableCell>
                          <TableCell>{shipment.processedBy?.name || t('common.unknown', 'Unknown')}</TableCell>
                          <TableCell>{formatDate(shipment.createdAt)}</TableCell>
                          <TableCell className="text-right">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => viewShipmentDetails(shipment.id)}
                            >
                              {t('common.viewDetails', 'View Details')}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-6">
                          {t('sales.shipment.history.noShipmentsFound', 'No shipments found')}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              
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
} 