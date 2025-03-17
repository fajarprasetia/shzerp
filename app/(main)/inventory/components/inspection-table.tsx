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

interface InspectionTableProps {
  stocks: Stock[];
  divided: Divided[];
}

export function InspectionTable({ stocks, divided }: InspectionTableProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID Number</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>GSM</TableHead>
            <TableHead>Width</TableHead>
            <TableHead>Length</TableHead>
            <TableHead>Weight</TableHead>
            <TableHead>Container No</TableHead>
            <TableHead>Arrival Date</TableHead>
            <TableHead>Actions</TableHead>
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
                <InspectStockButton stock={stock} />
              </TableCell>
            </TableRow>
          ))}
          {divided.map((item) => (
            <TableRow key={item.id}>
              <TableCell>{item.rollNo}</TableCell>
              <TableCell>{item.stockId === "current" ? "Current" : "Divided Roll"}</TableCell>
              <TableCell>{item.stockId === "current" ? "-" : item.stock?.gsm || "-"}</TableCell>
              <TableCell>{item.width}</TableCell>
              <TableCell>{item.length}</TableCell>
              <TableCell>{item.weight || "-"}</TableCell>
              <TableCell>-</TableCell>
              <TableCell>-</TableCell>
              <TableCell>
                <InspectDividedButton divided={item} />
              </TableCell>
            </TableRow>
          ))}
          {stocks.length === 0 && divided.length === 0 && (
            <TableRow>
              <TableCell colSpan={9} className="h-24 text-center">
                No items to inspect
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
} 