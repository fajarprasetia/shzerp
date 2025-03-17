import { ColumnDef } from "@tanstack/react-table";
import { Customer } from "@prisma/client";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Phone, MessageSquare, MapPin, MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const columns: ColumnDef<Customer>[] = [
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    accessorKey: "company",
    header: "Company",
  },
  {
    accessorKey: "phone",
    header: "Phone",
    cell: ({ row }) => {
      const phone = row.getValue("phone") as string;
      const formattedPhone = phone.startsWith("0") ? "+62" + phone.slice(1) : phone;
      return (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-blue-600 hover:text-blue-800"
          onClick={() => window.open(`tel:${formattedPhone}`, "_blank")}
        >
          <Phone className="h-4 w-4 mr-2" />
          {phone}
        </Button>
      );
    },
  },
  {
    accessorKey: "whatsapp",
    header: "WhatsApp",
    cell: ({ row }) => {
      const whatsapp = row.getValue("whatsapp") as string;
      const formattedWhatsapp = whatsapp.startsWith("0") ? "62" + whatsapp.slice(1) : whatsapp;
      return (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-green-600 hover:text-green-800"
          onClick={() => window.open(`https://wa.me/${formattedWhatsapp}`, "_blank")}
        >
          <MessageSquare className="h-4 w-4 mr-2" />
          {whatsapp}
        </Button>
      );
    },
  },
  {
    accessorKey: "address",
    header: "Address",
    cell: ({ row }) => {
      const address = row.getValue("address") as string;
      return (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-red-600 hover:text-red-800"
          onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, "_blank")}
        >
          <MapPin className="h-4 w-4 mr-2" />
          {address}
        </Button>
      );
    },
  },
  {
    accessorKey: "email",
    header: "Email",
  },
  {
    accessorKey: "createdAt",
    header: "Created At",
    cell: ({ row }) => format(new Date(row.getValue("createdAt")), "dd/MM/yyyy HH:mm"),
  },
  {
    id: "actions",
    cell: ({ row }) => {
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => {
                // Handle edit
              }}
            >
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-red-600"
              onClick={() => {
                // Handle delete
              }}
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
]; 