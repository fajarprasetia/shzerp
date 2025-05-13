"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Stock, Divided } from "@prisma/client";
import { InspectStockButton } from "./inspect-stock-button";
import { InspectDividedButton } from "./inspect-divided-button";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import i18nInstance from "@/app/i18n";
import { useState, useEffect } from "react";

interface InspectionTableProps {
  stocks: Stock[];
  divided: Divided[];
  onInspectStock?: (stockId: string) => void;
  onInspectDivided?: (dividedId: string) => void;
}

export function InspectionTable({ 
  stocks, 
  divided,
  onInspectStock,
  onInspectDivided
}: InspectionTableProps) {
  // Use the pre-initialized i18n instance
  const { t } = useTranslation(undefined, { i18n: i18nInstance });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Return a loading placeholder while mounting to avoid hydration issues
  if (!mounted) {
    return (
      <div className="rounded-md border p-4 text-center">
        {t('common.loading', 'Loading...')}
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('inventory.inspection.idNumber', 'ID Number')}</TableHead>
            <TableHead>{t('inventory.stock.type', 'Type')}</TableHead>
            <TableHead>{t('inventory.stock.gsm', 'GSM')}</TableHead>
            <TableHead>{t('inventory.stock.width', 'Width')}</TableHead>
            <TableHead>{t('inventory.stock.length', 'Length')}</TableHead>
            <TableHead>{t('inventory.stock.weight', 'Weight')}</TableHead>
            <TableHead>{t('inventory.stock.containerNo', 'Container No')}</TableHead>
            <TableHead>{t('inventory.stock.arrivalDate', 'Arrival Date')}</TableHead>
            <TableHead>{t('common.actions', 'Actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {stocks.map((stock) => (
            <TableRow key={stock.id}>
              <TableCell>{stock.jumboRollNo}</TableCell>
              <TableCell>{stock.type}</TableCell>
              <TableCell>{stock.gsm}</TableCell>
              <TableCell>{stock.width}</TableCell>
              <TableCell>{stock.length}</TableCell>
              <TableCell>{stock.weight}</TableCell>
              <TableCell>{stock.containerNo}</TableCell>
              <TableCell>
                {format(new Date(stock.arrivalDate), "dd/MM/yyyy")}
              </TableCell>
              <TableCell>
                <InspectStockButton 
                  stock={stock} 
                  onInspect={onInspectStock ? () => onInspectStock(stock.id) : undefined}
                />
              </TableCell>
            </TableRow>
          ))}
          {divided.map((item) => (
            <TableRow key={item.id}>
              <TableCell>{item.rollNo}</TableCell>
              <TableCell>{item.stockId === "current" ? t('inventory.divided.current', 'Current') : t('inventory.divided.dividedRoll', 'Divided Roll')}</TableCell>
              <TableCell>{item.stockId === "current" ? "-" : item.stock?.gsm || "-"}</TableCell>
              <TableCell>{item.width}</TableCell>
              <TableCell>{item.length}</TableCell>
              <TableCell>{item.weight || "-"}</TableCell>
              <TableCell>-</TableCell>
              <TableCell>-</TableCell>
              <TableCell>
                <InspectDividedButton 
                  divided={item} 
                  onInspect={onInspectDivided ? () => onInspectDivided(item.id) : undefined}
                />
              </TableCell>
            </TableRow>
          ))}
          {stocks.length === 0 && divided.length === 0 && (
            <TableRow>
              <TableCell colSpan={9} className="h-24 text-center">
                {t('inventory.inspection.noItemsToInspect', 'No items to inspect')}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
} 