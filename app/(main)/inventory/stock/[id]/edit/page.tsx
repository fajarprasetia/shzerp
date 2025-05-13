"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Stock } from "@prisma/client";
import { StockForm } from "../../../components/stock-form";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import i18nInstance from "@/app/i18n";

export default function EditStockPage({ params }: { params: { id: string } }) {
  const [stock, setStock] = useState<Stock | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { t } = useTranslation(undefined, { i18n: i18nInstance });

  useEffect(() => {
    const fetchStock = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/inventory/stock/${params.id}`);
        
        if (!response.ok) {
          throw new Error(t('inventory.stock.fetchError', 'Failed to fetch stock details'));
        }
        
        const data = await response.json();
        setStock(data);
      } catch (error) {
        console.error("Error fetching stock:", error);
        toast({
          title: t('common.error', 'Error'),
          description: error instanceof Error 
            ? error.message 
            : t('inventory.stock.fetchError', 'Failed to fetch stock details'),
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchStock();
  }, [params.id, t]);

  const handleSubmit = (updatedStock: Stock) => {
    toast({
      title: t('common.success', 'Success'),
      description: t('inventory.stock.updateSuccess', 'Stock updated successfully'),
    });
    router.push("/inventory/stock");
  };

  const handleCancel = () => {
    router.back();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!stock) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex flex-col items-center justify-center space-y-4">
          <h1 className="text-2xl font-bold text-destructive">
            {t('inventory.stock.notFound', 'Stock Not Found')}
          </h1>
          <p className="text-muted-foreground">
            {t('inventory.stock.notFoundDescription', 'The requested stock item could not be found.')}
          </p>
          <Button onClick={() => router.push("/inventory/stock")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('common.backToList', 'Back to List')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center">
        <Button
          variant="link"
          className="p-0 flex items-center text-muted-foreground"
          onClick={handleCancel}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('common.back', 'Back')}
        </Button>
      </div>
      
      <StockForm 
        initialData={stock} 
        onSubmit={handleSubmit} 
        onCancel={handleCancel} 
      />
    </div>
  );
} 