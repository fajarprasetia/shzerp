"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, FieldValues, UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Customer, Stock, Divided, Order, OrderItem as PrismaOrderItem } from "@prisma/client";
import { X, Plus, ChevronsUpDown, Check, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useOrderFinance } from "@/hooks/use-order-finance";
import { notifyTransactionCreated } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { useOrderFormData } from "@/hooks/use-order-form-data";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import i18nInstance from "@/app/i18n";

const productTypes = ["Sublimation Paper", "Protect Paper", "DTF Film", "Ink"] as const;
const sublimationProducts = ["Jumbo Roll", "Roll"] as const;

type ProductType = typeof productTypes[number];
type SublimationProductType = typeof sublimationProducts[number];

interface StockWithQuantity extends Stock {
  remainingLength: number;
}

interface DividedWithGSM extends Omit<Divided, 'stock'> {
  stock?: {
  gsm: number;
    type: string;
    id: string;
  };
  gsm?: number; // Added by API or hook for compatibility
  stockId: string; // This is what actually exists in Divided model
}

// Add the OrderWithCustomer type
interface OrderWithCustomer extends Omit<Order, 'discountType'> {
  customer: Customer;
  orderItems: PrismaOrderItem[];
  discountType: "percentage" | "value";
}

interface OrderFormProps {
  initialData?: OrderWithCustomer;
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
}

interface OrderItem {
  type: ProductType;
  product?: SublimationProductType;
  gsm?: string;
  width?: string;
  length?: string;
  weight?: string | null;
  quantity: number;
  price: number;
  tax: number;
  stockId?: string;
}

const orderItemSchema = z.object({
  type: z.enum(productTypes),
  product: z.enum(sublimationProducts).optional(),
  gsm: z.string().optional(),
  width: z.string().optional(),
  length: z.string().optional(),
  weight: z.string().nullable().optional(),
  quantity: z.number().min(1, "Quantity must be greater than 0"),
  price: z.number().min(0, "Price must be greater than or equal to 0"),
  tax: z.number().min(0, "Tax must be greater than or equal to 0"),
  stockId: z.string().optional(),
});

const formSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  orderItems: z.array(orderItemSchema).min(1, "At least one item is required"),
  note: z.string().optional(),
  discount: z.number().min(0, "Discount must be greater than or equal to 0").default(0),
  discountType: z.enum(["percentage", "value"]).default("percentage"),
}).refine((data) => {
  // When discount type is percentage, value must be between 0 and 100
  if (data.discountType === "percentage") {
    return data.discount <= 100;
  }
  return true;
}, {
  message: "Percentage discount cannot exceed 100%",
  path: ["discount"], // Path to the field with the error
});

type FormValues = z.infer<typeof formSchema>;

const defaultValues: FormValues = {
  customerId: "",
  orderItems: [{
    type: "Sublimation Paper",
    product: undefined,
    price: 0,
    tax: 0,
    quantity: 1
  }],
  note: "",
  discount: 0,
  discountType: "percentage",
};

// Add this type for better type safety
interface CustomerOption {
  id: string;
  name: string;
  phone: string;
}

// Helper functions at the top
function convertMmToM(mm: number): number {
  return mm / 1000;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function OrderForm({ initialData, onSubmit, onCancel }: OrderFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useTranslation(undefined, { i18n: i18nInstance });
  const [isLoading, setIsLoading] = useState(false);
  const { customers, stocks, dividedStocks, isLoading: orderFormDataLoading } = useOrderFormData();
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [checkedItems, setCheckedItems] = useState<number[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);

  // Add debug logs
  useEffect(() => {
    console.log('Customers:', customers);
  }, [customers]);

  // Add debug for dividedStocks structure
  useEffect(() => {
    if (dividedStocks && dividedStocks.length > 0) {
      console.log('First dividedStock item structure:', JSON.stringify(dividedStocks[0], null, 2));
      console.log('Total dividedStocks available:', dividedStocks.length);
      
      // Check all properties to debug
      console.log('dividedStocks[0] properties:',
        Object.keys(dividedStocks[0]).join(', '),
        'stockId exists:', 'stockId' in dividedStocks[0],
        'stock exists:', 'stock' in dividedStocks[0],
        'gsm exists:', 'gsm' in dividedStocks[0]
      );
    }
  }, [dividedStocks]);

  const allowedTypes: ProductType[] = ["Sublimation Paper", "Protect Paper", "DTF Film", "Ink"];

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customerId: initialData?.customerId || "",
      orderItems: initialData?.orderItems
        ? initialData.orderItems
            .filter(item => allowedTypes.includes(item.type as ProductType))
            .map(item => ({
              type: item.type as ProductType,
              product: (item.product as SublimationProductType) || undefined,
              gsm: item.gsm ?? undefined,
              width: item.width ?? undefined,
              length: item.length ?? undefined,
              weight: item.weight ?? undefined,
              quantity: item.quantity ?? 1,
              price: item.price ?? 0,
              tax: item.tax ?? 0,
              stockId: item.stockId ?? undefined,
            }))
        : [
            {
              type: "Sublimation Paper",
              product: undefined,
              price: 0,
              tax: 0,
              quantity: 1,
              weight: "",
              length: "",
              width: "",
              gsm: "",
            },
          ],
      note: initialData?.note || "",
      discount: initialData?.discount || 0,
      discountType: initialData?.discountType || "percentage",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "orderItems",
  });

  const watchedItems = form.watch("orderItems") || defaultValues.orderItems;
  
  const { total, formattedTotal } = useOrderFinance({
    items: watchedItems.map(item => ({
      quantity: item.quantity || 1,
      unitPrice: item.price || 0,
      tax: item.tax || 0,
    })) as any, // Type assertion required due to different expected interfaces
  });

  // Add form watch for all fields
  const watchedFields = form.watch();

  // Move getWeightFromStock inside component but before other functions that use it
  const getWeightFromStock = (type: string, gsm?: string, width?: string) => {
    if (!gsm || !width) return undefined;

    const stock = stocks?.find(s => 
      s.type === type && 
      s.gsm.toString() === gsm && 
      s.width.toString() === width
    );

    return stock?.weight;
  };

  // Update the calculateItemTotal function
  const calculateItemTotal = (item: OrderItem): number => {
    if (!item) return 0;
    
    console.log('Calculating total for item:', item);
    
    const price = Number(item.price) || 0;
    const tax = Number(item.tax) || 0;
    const taxMultiplier = 1 + (tax / 100);

    let subtotal = 0;

    switch (item.type) {
      case "Sublimation Paper":
        if (item.product === "Jumbo Roll") {
          const weight = Number(item.weight) || 
            Number(getWeightFromStock(item.type, item.gsm, item.width)) || 0;
          
          subtotal = price * weight;
          console.log('Jumbo Roll calculation:', { price, weight, subtotal });
        } else if (item.product === "Roll") {
          const width = Number(item.width) / 100; // Convert to meters
          const length = Number(item.length) || 0;
          const quantity = Number(item.quantity) || 1;
          
          subtotal = price * width * length * quantity;
          console.log('Roll calculation:', { 
            price,
            width: `${width}m (from ${item.width}mm)`,
            length: `${length}m`,
            quantity,
            calculation: `${price} * ${width} * ${length} * ${quantity}`,
            subtotal
          });
        }
        break;

      case "Protect Paper":
        const protectWeight = Number(item.weight) || 0;
        subtotal = price * protectWeight;
        console.log('Protect Paper calculation:', { price, weight: protectWeight, subtotal });
        break;

      case "DTF Film":
      case "Ink":
        const quantity = Number(item.quantity) || 1;
        subtotal = price * quantity;
        console.log('DTF/Ink calculation:', { price, quantity, subtotal });
        break;
    }

    const total = subtotal * taxMultiplier;
    console.log('Final calculation:', { 
      subtotal, 
      taxMultiplier, 
      calculation: `${subtotal} * ${taxMultiplier}`,
      total 
    });
    
    return total;
  };

  // Update calculateOrderTotal to use the inner calculateItemTotal
  const calculateOrderTotal = () => {
    const items = form.getValues("orderItems") || [];
    const discount = form.getValues("discount") || 0;
    const discountType = form.getValues("discountType") || "percentage";

    let totalSum = 0;
    const itemDetails = items.map(item => {
      const itemTotal = calculateItemTotal(item);
      totalSum += itemTotal;
      
      return {
        type: item.type,
        product: item.product,
        price: Number(item.price),
        quantity: Number(item.quantity),
        tax: Number(item.tax),
        taxMultiplier: 1 + (Number(item.tax) / 100),
        itemTotal
      };
    });
    
    let discountedTotal = totalSum;
    if (discountType === "percentage") {
      // Ensure percentage discount is capped at 100%
      const cappedDiscount = Math.min(discount, 100);
      discountedTotal = totalSum - (totalSum * (cappedDiscount / 100));
    } else {
      // Value-based discount: directly subtract the amount
      discountedTotal = totalSum - discount;
    }
    
    // Ensure total is not negative
    if (discountedTotal < 0) discountedTotal = 0;
    
    console.log('Item-by-item calculation details:', itemDetails);
    console.log('Final calculated total:', discountedTotal);
    
    return Number(discountedTotal.toFixed(2));
  };

  const getAvailableGSM = (type: string, product?: string) => {
    console.log('getAvailableGSM called with:', { type, product });
    if (type !== "Sublimation Paper" || !product) return [];

    if (product === "Jumbo Roll") {
      // For Jumbo Roll, get GSM from stocks
      const filteredStocks = stocks
        .filter(s => s.type === "Sublimation Paper" && s.remainingLength > 0);
      console.log('Filtered Stocks for Jumbo Roll:', filteredStocks);
      const gsmList = filteredStocks
        .map(s => s.gsm)
        .filter(gsm => gsm !== null && gsm !== undefined)
        .map(gsm => gsm.toString());
      console.log('GSM List for Jumbo Roll:', gsmList);
      return Array.from(new Set(gsmList)).sort((a, b) => parseFloat(a) - parseFloat(b));
    } 

    if (product === "Roll") {
      // For Roll, get available divided stocks first
      const availableDivided = dividedStocks.filter(d => d.remainingLength > 0);
      console.log('Available divided stocks for Roll:', availableDivided);
      
      // Extract any GSM values available
      const gsmValues: number[] = [];
      
      availableDivided.forEach(d => {
        // Try to get gsm from anywhere it might exist
        let gsmValue: number | undefined;
        
        // First check direct gsm property
        if ('gsm' in d && d.gsm !== undefined && d.gsm !== null) {
          gsmValue = d.gsm;
        }
        // Next check in stock object if it exists
        else if ('stock' in d && d.stock && typeof d.stock === 'object' && 'gsm' in (d.stock as any)) {
          gsmValue = (d.stock as any).gsm;
        }
        
        if (gsmValue !== undefined) {
          gsmValues.push(gsmValue);
        }
      });
      
      // Convert to strings
      const gsmList = gsmValues.map(gsm => gsm.toString());
      console.log('Extracted GSM values for Roll:', gsmList);
      
      return Array.from(new Set(gsmList)).sort((a, b) => parseFloat(a) - parseFloat(b));
    }

    return [];
  };

  const getAvailableWidths = (type: string, product?: string, gsm?: string) => {
    console.log('Getting Widths for:', { type, product, gsm }); // Debug log

    if (!gsm || type !== "Sublimation Paper" || !product) return [];

    if (product === "Jumbo Roll") {
      // For Jumbo Roll, get widths from stocks with matching GSM
      const widthList = stocks
        .filter(s => 
          s.type === "Sublimation Paper" && 
          s.gsm.toString() === gsm &&
          s.remainingLength > 0
        )
        .map(s => s.width.toString());
      console.log('Available Jumbo Roll Widths:', widthList);
      return Array.from(new Set(widthList)).sort((a, b) => parseFloat(a) - parseFloat(b));
    }

    if (product === "Roll") {
      // For Roll, find divided items that match the GSM
      const matchingDivided = dividedStocks.filter(d => {
        let gsmValue: number | undefined;
        
        // Check for gsm property
        if ('gsm' in d && d.gsm !== undefined) {
          gsmValue = d.gsm;
        }
        // Check in stock object if available
        else if ('stock' in d && d.stock && typeof d.stock === 'object' && 'gsm' in (d.stock as any)) {
          gsmValue = (d.stock as any).gsm;
        }
        
        return gsmValue?.toString() === gsm && d.remainingLength > 0;
      });
      
      console.log('Matching divided for widths:', matchingDivided);
      
      const widthList = matchingDivided.map(d => d.width.toString());
      console.log('Available Roll Widths:', widthList);
      
      return Array.from(new Set(widthList)).sort((a, b) => parseFloat(a) - parseFloat(b));
    }

    return [];
  };

  const getAvailableLengths = (type: string, product?: string, width?: string, gsm?: string) => {
    if (!product || !width || !gsm || type !== "Sublimation Paper" || product !== "Roll") return [];
    
    console.log('Getting Lengths for:', { type, product, width, gsm }); // Debug log
    
    // Filter divided stocks by GSM and width
    const matchingDivided = dividedStocks.filter(d => {
      let gsmValue: number | undefined;
      
      // Check for gsm property
      if ('gsm' in d && d.gsm !== undefined) {
        gsmValue = d.gsm;
      }
      // Check in stock object if available
      else if ('stock' in d && d.stock && typeof d.stock === 'object' && 'gsm' in (d.stock as any)) {
        gsmValue = (d.stock as any).gsm;
      }
      
      return gsmValue?.toString() === gsm && 
        d.width.toString() === width &&
             d.remainingLength > 0;
    });

    console.log('Matching divided for lengths:', matchingDivided);
    
    const lengthList = matchingDivided.map(d => d.length.toString());
    console.log('Available Roll Lengths:', lengthList);
    
    return Array.from(new Set(lengthList)).sort((a, b) => parseFloat(a) - parseFloat(b));
  };

  const getAvailableWeights = (type: string, gsm?: string, width?: string) => {
    if (!gsm || !width) return [];

    // Get weights from stocks with matching criteria
    const weightList = stocks
      .filter(s => 
        s.type === type && 
        s.gsm.toString() === gsm && 
        s.width.toString() === width &&
        s.remainingLength > 0
      )
      .map(s => s.weight.toString());

    console.log('Available Weights:', weightList);
    return Array.from(new Set(weightList)).sort((a, b) => parseFloat(a) - parseFloat(b));
  };

  const checkStockAvailability = (item: OrderItem) => {
    switch (item.type) {
      case "DTF Film":
        const dtfStock = stocks
        .filter(s => s.type === "DTF Film")
        .reduce((sum, s) => sum + s.remainingLength, 0);
        return {
          available: dtfStock,
          unit: "rolls"
        };

      case "Ink":
        const inkStock = stocks
        .filter(s => s.type === "Ink")
        .reduce((sum, s) => sum + s.remainingLength, 0);
        return {
          available: inkStock,
          unit: "bottles"
        };

      case "Sublimation Paper":
        if (item.product === "Roll") {
          const rollStock = dividedStocks.filter(s => 
            s.gsm.toString() === item.gsm && 
            s.width.toString() === item.width &&
            s.length.toString() === item.length
          ).length;
          return {
            available: rollStock,
            unit: "rolls"
          };
        }
        // For Jumbo Roll, we'll check by weight
        if (item.product === "Jumbo Roll") {
          const jumboStock = stocks.filter(s =>
            s.type === "Sublimation Paper" &&
        s.gsm.toString() === item.gsm && 
            s.width.toString() === item.width &&
            s.weight.toString() === item.weight
      ).length;
          return {
            available: jumboStock,
            unit: "rolls"
          };
        }
        return { available: 0, unit: "rolls" };

      case "Protect Paper":
        const protectStock = stocks.filter(s =>
          s.type === "Protect Paper" &&
          s.gsm.toString() === item.gsm &&
          s.width.toString() === item.width &&
          s.weight.toString() === item.weight
        ).length;
        return {
          available: protectStock,
          unit: "rolls"
        };

      default:
        return { available: 0, unit: "units" };
    }
  };

  // Update the checkStockWarning function
  const checkStockWarning = (item: OrderItem) => {
    const stock = checkStockAvailability(item);
    if (item.quantity && item.quantity > stock.available) {
      return `Warning: Only ${stock.available} ${stock.unit} available`;
    }
    return null;
  };

  // Add customer selection handler
  const handleCustomerSelect = (customerId: string) => {
    form.setValue('customerId', customerId);
    setOpen(false);
  };

  // Update the onSubmit function
  const handleSubmit = async (data: FormValues) => {
    try {
      setIsLoading(true);
      
      // Validate required fields
      if (!data.customerId) {
        throw new Error(t('sales.orders.errors.customerRequired', 'Customer is required'));
      }

      if (!data.orderItems || data.orderItems.length === 0) {
        throw new Error(t('sales.orders.errors.itemsRequired', 'At least one order item is required'));
      }

      // Validate discount
      if (data.discountType === "percentage" && (data.discount < 0 || data.discount > 100)) {
        throw new Error(t('sales.orders.errors.invalidDiscount', 'Percentage discount must be between 0 and 100'));
      }

      if (data.discountType === "value" && data.discount < 0) {
        throw new Error(t('sales.orders.errors.invalidDiscount', 'Value discount must be greater than or equal to 0'));
      }

      const orderItems = data.orderItems.map(item => {
        console.log('Processing item for submission:', item);
        
        // Validate item fields
        if (!item.type) {
          throw new Error(t('sales.orders.errors.itemTypeRequired', 'Item type is required'));
        }
        
        // Ensure numeric values are properly converted
        const quantity = Number(item.quantity);
        const price = Number(item.price);
        const tax = Number(item.tax || 0);
        
        if (!quantity || quantity <= 0) {
          throw new Error(t('sales.orders.errors.invalidQuantity', 'Invalid quantity'));
        }
        if (!price || price <= 0) {
          throw new Error(t('sales.orders.errors.invalidPrice', 'Invalid price'));
        }

        // Find matching stock/divided item and set stockId
        let stockId = '';
        if (item.type === 'Sublimation Paper') {
          if (item.product === 'Roll') {
            const dividedStock = dividedStocks.find(d => {
              // Try to get gsm value safely
              let gsmValue: number | undefined;
              if ('gsm' in d && d.gsm !== undefined) {
                gsmValue = d.gsm;
              } else if ('stock' in d && d.stock && typeof d.stock === 'object' && 'gsm' in (d.stock as any)) {
                gsmValue = (d.stock as any).gsm;
              }
              
              return gsmValue?.toString() === item.gsm && 
                d.width.toString() === item.width &&
                d.length.toString() === item.length &&
                d.remainingLength > 0;
            });
            stockId = dividedStock?.id || '';
            console.log('Found Roll stock:', { dividedStock, stockId });
          } else if (item.product === 'Jumbo Roll') {
            const stock = stocks.find(s =>
              s.type === item.type &&
              s.gsm.toString() === item.gsm &&
              s.width.toString() === item.width &&
              s.weight?.toString() === item.weight &&
              s.remainingLength > 0
            );
            stockId = stock?.id || '';
            console.log('Found Jumbo Roll stock:', { stock, stockId });
          }
        } else if (item.type === 'Protect Paper') {
          const stock = stocks.find(s =>
            s.type === item.type &&
            s.gsm.toString() === item.gsm &&
            s.width.toString() === item.width &&
            s.weight?.toString() === item.weight &&
            s.remainingLength > 0
          );
          stockId = stock?.id || '';
          console.log('Found Protect Paper stock:', { stock, stockId });
        } else if (item.type === 'DTF Film' || item.type === 'Ink') {
          const stock = stocks.find(s =>
            s.type === item.type &&
            s.remainingLength > 0
          );
          stockId = stock?.id || '';
          console.log('Found DTF/Ink stock:', { stock, stockId });
        }

        if (!stockId) {
          throw new Error(t('sales.orders.errors.productRequired', 'Please select a valid product from inventory'));
        }

        const baseItem = {
          type: item.type,
          product: item.product || null,
          gsm: item.gsm || null,
          width: item.width || null,
          length: item.length || null,
          weight: item.weight || null,
          quantity: quantity,
          price: price,
          tax: tax,
          productId: stockId, // Map stockId to productId for API
        };

        return baseItem;
      });

      console.log('Prepared order items for submission:', orderItems);

      // Calculate the total amount - ensure it's a proper number
      const totalAmount = Number(calculateOrderTotal().toFixed(2));
      console.log('Total amount for submission:', totalAmount);

      // Prepare final submission data
      const submissionData = {
        customerId: data.customerId,
        orderItems,
        note: data.note || "",
        totalAmount,
        discount: Number(data.discount),
        discountType: data.discountType,
      };

      console.log('Final submission data:', submissionData);

      await onSubmit(submissionData);

    } catch (error) {
      console.error('Form submission error:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      
      toast({
        title: t('common.error', 'Error'),
        description: error instanceof Error ? error.message : t('sales.orders.saveError', 'Failed to save order'),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Add more detailed debug logs
  useEffect(() => {
    console.log('Form Values:', form.getValues());
    console.log('Customer ID:', form.getValues('customerId'));
  }, [form]);

  // Modify the onCustomerSelect function
  const onCustomerSelect = (customerId: string) => {
    console.log('Selecting customer:', customerId);
    form.setValue("customerId", customerId, { shouldValidate: true });
    setSearchValue("");
    setOpen(false);
  };

  // Update the handleFieldChange function
  const handleFieldChange = (index: number, field: keyof OrderItem, value: string) => {
    console.log(`Changing ${field} to ${value} at index ${index}`);
    
    // Type-safe setValue
    const path = `orderItems.${index}.${field}` as const;
    
    // Special handling for product field to ensure type safety
    if (field === 'product') {
      if (value === '') {
        form.setValue(path, undefined);
      } else {
        form.setValue(path, value as SublimationProductType);
      }
      
      // Reset dependent fields
      form.setValue(`orderItems.${index}.gsm`, '');
      form.setValue(`orderItems.${index}.width`, '');
      form.setValue(`orderItems.${index}.length`, '');
      form.setValue(`orderItems.${index}.weight`, '');
      form.setValue(`orderItems.${index}.quantity`, 1);
      form.setValue(`orderItems.${index}.stockId`, ''); // Clear stockId when product changes
      
      // Trigger validation
      form.trigger(`orderItems.${index}`);
      return;
    }
    
    // Set the value directly
    form.setValue(path, value);

    // Set default values based on product type
    if (field === 'type') {
      // Clear weight field only for Roll type
      if (value === 'Roll') {
        form.setValue(`orderItems.${index}.weight`, null);
      }
      form.setValue(`orderItems.${index}.product`, undefined);
      form.setValue(`orderItems.${index}.gsm`, '');
      form.setValue(`orderItems.${index}.width`, '');
      form.setValue(`orderItems.${index}.length`, '');
      form.setValue(`orderItems.${index}.stockId`, ''); // Clear stockId when type changes
    }

    // Reset dependent fields
    switch (field) {
      case 'type':
        form.setValue(`orderItems.${index}.product`, undefined);
        form.setValue(`orderItems.${index}.gsm`, '');
        form.setValue(`orderItems.${index}.width`, '');
        form.setValue(`orderItems.${index}.length`, '');
        form.setValue(`orderItems.${index}.quantity`, 1);
        form.setValue(`orderItems.${index}.stockId`, ''); // Clear stockId when type changes
        break;

      case 'gsm':
        form.setValue(`orderItems.${index}.width`, '');
        form.setValue(`orderItems.${index}.length`, '');
        form.setValue(`orderItems.${index}.weight`, '');
        form.setValue(`orderItems.${index}.quantity`, 1);
        form.setValue(`orderItems.${index}.stockId`, ''); // Clear stockId when GSM changes
        break;

      case 'width':
        form.setValue(`orderItems.${index}.length`, '');
        form.setValue(`orderItems.${index}.weight`, '');
        form.setValue(`orderItems.${index}.quantity`, 1);
        form.setValue(`orderItems.${index}.stockId`, ''); // Clear stockId when width changes
        break;

      case 'length':
      case 'weight':
        // Find matching stock/divided item and set stockId
        const item = form.getValues(`orderItems.${index}`);
        const type = item.type;
        const product = item.product;
        const gsm = item.gsm;
        const width = item.width;
        const length = item.length;
        const weight = item.weight;

        console.log('Finding matching stock for:', { type, product, gsm, width, length, weight });

        let stockId = '';
        if (type === 'Sublimation Paper') {
          if (product === 'Roll') {
            const dividedStock = dividedStocks.find(d => {
              // Find the related stock using stockId
              const stock = stocks.find(s => s.id === d.stockId);
              return stock?.gsm.toString() === gsm && 
                d.width.toString() === width &&
                d.length.toString() === length &&
                d.remainingLength > 0;
            });
            stockId = dividedStock?.id || '';
            console.log('Found Roll stock:', { dividedStock, stockId });
          } else if (product === 'Jumbo Roll') {
            const stock = stocks.find(s =>
              s.type === type &&
              s.gsm.toString() === gsm &&
              s.width.toString() === width &&
              s.weight.toString() === weight &&
              s.remainingLength > 0
            );
            stockId = stock?.id || '';
            console.log('Found Jumbo Roll stock:', { stock, stockId });
          }
        } else if (type === 'Protect Paper') {
          const stock = stocks.find(s =>
            s.type === type &&
            s.gsm.toString() === gsm &&
            s.width.toString() === width &&
            s.weight.toString() === weight &&
            s.remainingLength > 0
          );
          stockId = stock?.id || '';
          console.log('Found Protect Paper stock:', { stock, stockId });
        } else if (type === 'DTF Film' || type === 'Ink') {
          const stock = stocks.find(s =>
            s.type === type &&
            s.remainingLength > 0
          );
          stockId = stock?.id || '';
          console.log('Found DTF/Ink stock:', { stock, stockId });
        }

        if (!stockId) {
          console.warn('No matching stock found for:', { type, product, gsm, width, length, weight });
        }

        form.setValue(`orderItems.${index}.stockId`, stockId);
        break;
    }

    form.trigger(`orderItems.${index}`);
  };

  // Add useEffect to watch form changes
  useEffect(() => {
    console.log('Form values changed:', watchedFields);
  }, [watchedFields]);

  // Add toggle functions
  const toggleItemCheck = (index: number) => {
    setCheckedItems(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  // Add summary component
  const OrderItemSummary = ({ item, index }: { item: OrderItem; index: number }) => {
    return (
      <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
        <div className="space-y-1">
          <div className="font-medium">{item.type}</div>
          <div className="text-sm text-muted-foreground">
            {item.product && `${item.product} - `}
            {item.gsm && `${item.gsm}gsm - `}
            {item.width && `${item.width}mm`}
            {item.product === "Jumbo Roll" && item.weight && ` - ${item.weight}kg`}
            {item.product === "Roll" && (
              <>
                {item.length && ` - ${item.length}mm`}
                {item.quantity && ` × ${item.quantity}`}
              </>
            )}
          </div>
          <div className="text-sm font-medium">
            Price: {formatCurrency(Number(item.price))}
            {item.tax > 0 && ` + ${item.tax}% tax`}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right font-medium">
            {formatCurrency(calculateItemTotal(item))}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => toggleItemCheck(index)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  useEffect(() => {
    if (initialData) {
      // Set form values from initialData
      form.reset({
        customerId: initialData.customerId,
        note: initialData.note || "",
        discount: initialData.discount || 0,
        discountType: initialData.discountType || "percentage",
        orderItems: initialData.orderItems
          .filter(item => allowedTypes.includes(item.type as ProductType))
          .map(item => ({
            type: item.type as ProductType,
            product: (item.product as SublimationProductType) || undefined,
            gsm: item.gsm ?? undefined,
            width: item.width ?? undefined,
            length: item.length ?? undefined,
            weight: item.weight ?? undefined,
            quantity: item.quantity ?? 1,
            price: item.price ?? 0,
            tax: item.tax ?? 0,
            stockId: item.stockId ?? undefined,
          }))
      } as FormValues); // Type assertion to FormValues

      // Set all items to checked state when editing
      const itemIndices = initialData.orderItems.map((_, i) => i);
      setCheckedItems(itemIndices);

      // Update OrderItemSummary state
      const watchedItems = form.watch("orderItems");
      setOrderItems(watchedItems);
    }
  }, [initialData, form]);

  if (orderFormDataLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex items-center space-x-2">
          <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-gray-900"></div>
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 gap-6">
          {/* Customer Selection */}
        <FormField
          control={form.control}
          name="customerId"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Customer</FormLabel>
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {customers?.map((customer: CustomerOption) => (
                      <SelectItem 
                          key={customer.id}
                        value={customer.id}
                      >
                        {customer.name} - {customer.phone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              <FormMessage />
            </FormItem>
          )}
        />

          {/* Order Items */}
        <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Order Items</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({
                  type: "Sublimation Paper",
                  price: 0,
                  tax: 0,
                  quantity: 1,
                })}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Product
              </Button>
            </div>

            {fields.map((field, index) => (
              <div key={field.id} className="space-y-4">
                {checkedItems.includes(index) ? (
                  <OrderItemSummary 
                    item={form.getValues(`orderItems.${index}`)} 
                    index={index} 
                  />
                ) : (
                  <div className="relative p-4 border rounded-lg bg-card">
                    <div className="absolute right-2 top-2 flex items-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleItemCheck(index)}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => remove(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {/* Type Selection - Always First */}
                  <FormField
                    control={form.control}
                    name={`orderItems.${index}.type`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                            <FormLabel>Type *</FormLabel>
                            <Select 
                              onValueChange={(value) => handleFieldChange(index, 'type', value)} 
                              defaultValue={field.value}
                            >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {productTypes.map((type) => (
                              <SelectItem key={type} value={type}>
                                {type}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                      {/* Product Selection - For Sublimation Paper */}
                      {field.type === "Sublimation Paper" && (
                    <FormField
                      control={form.control}
                      name={`orderItems.${index}.product`}
                      render={({ field }) => (
                        <FormItem className="flex-1">
                              <FormLabel>Product *</FormLabel>
                              <Select 
                                onValueChange={(value) => handleFieldChange(index, 'product', value)}
                                value={field.value}
                              >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select product" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {sublimationProducts.map((product) => (
                                <SelectItem key={product} value={product}>
                                  {product}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                      {/* GSM Selection */}
                      {(field.type === "Sublimation Paper" || field.type === "Protect Paper") && (
                      <FormField
                        control={form.control}
                        name={`orderItems.${index}.gsm`}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                              <FormLabel>GSM *</FormLabel>
                            <Select 
                                onValueChange={(value) => handleFieldChange(index, 'gsm', value)}
                                value={field.value || ''}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select GSM" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                  {getAvailableGSM(
                                    form.getValues(`orderItems.${index}.type`),
                                    form.getValues(`orderItems.${index}.product`)
                                  ).map((gsm) => (
                                    <SelectItem key={gsm} value={gsm}>
                                    {gsm}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      )}

                      {/* Width Selection */}
                      {(field.type === "Sublimation Paper" || field.type === "Protect Paper") && (
                      <FormField
                        control={form.control}
                        name={`orderItems.${index}.width`}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                              <FormLabel>Width (mm) *</FormLabel>
                            <Select 
                                onValueChange={(value) => handleFieldChange(index, 'width', value)}
                                value={field.value || ''}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select width" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                  {getAvailableWidths(
                                    form.getValues(`orderItems.${index}.type`),
                                    form.getValues(`orderItems.${index}.product`),
                                    form.getValues(`orderItems.${index}.gsm`) || ''
                                  ).map((width) => (
                                    <SelectItem key={width} value={width}>
                                    {width}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                  )}

                      {/* Weight field */}
                      <FormField
                        control={form.control}
                        name={`orderItems.${index}.weight`}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormLabel className={cn(
                              form.getValues(`orderItems.${index}.product`) === "Roll" && 
                              "text-muted-foreground"
                            )}>
                              Weight (kg) {form.getValues(`orderItems.${index}.product`) === "Jumbo Roll" && "*"}
                            </FormLabel>
                            <Select 
                              onValueChange={(value) => handleFieldChange(index, 'weight', value)}
                              value={field.value || ''}
                              disabled={form.getValues(`orderItems.${index}.product`) === "Roll"}
                            >
                              <FormControl>
                                <SelectTrigger className={cn(
                                  form.getValues(`orderItems.${index}.product`) === "Roll" && 
                                  "bg-muted"
                                )}>
                                  <SelectValue placeholder="Select weight" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {getAvailableWeights(
                                  form.getValues(`orderItems.${index}.type`),
                                  form.getValues(`orderItems.${index}.gsm`) || '',
                                  form.getValues(`orderItems.${index}.width`) || ''
                                ).map((weight) => (
                                  <SelectItem key={weight} value={weight}>
                                    {weight}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Length field */}
                      <FormField
                        control={form.control}
                        name={`orderItems.${index}.length`}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormLabel className={cn(
                              form.getValues(`orderItems.${index}.product`) === "Jumbo Roll" && 
                              "text-muted-foreground"
                            )}>
                              Length (m) {form.getValues(`orderItems.${index}.product`) === "Roll" && "*"}
                            </FormLabel>
                          <Select 
                              onValueChange={(value) => handleFieldChange(index, 'length', value)}
                              value={field.value || ''}
                              disabled={form.getValues(`orderItems.${index}.product`) === "Jumbo Roll"}
                          >
                            <FormControl>
                                <SelectTrigger className={cn(
                                  form.getValues(`orderItems.${index}.product`) === "Jumbo Roll" && 
                                  "bg-muted"
                                )}>
                                  <SelectValue placeholder="Select length" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {getAvailableLengths(
                                  form.getValues(`orderItems.${index}.type`),
                                  form.getValues(`orderItems.${index}.product`),
                                  form.getValues(`orderItems.${index}.width`) || '',
                                  form.getValues(`orderItems.${index}.gsm`) || ''
                                ).map((length) => (
                                  <SelectItem key={length} value={length}>
                                    {length}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                      {/* Quantity field - always visible, disabled for Jumbo Roll */}
                    <FormField
                      control={form.control}
                      name={`orderItems.${index}.quantity`}
                      render={({ field }) => (
                        <FormItem className="flex-1">
                            <FormLabel className={cn(
                              form.getValues(`orderItems.${index}.product`) === "Jumbo Roll" && 
                              "text-muted-foreground"
                            )}>
                              Quantity {form.getValues(`orderItems.${index}.product`) === "Roll" && "*"}
                          </FormLabel>
                          <FormControl>
                <Input
                  type="number"
                              min="1"
                                step="1"
                                value={field.value || 1}
                                onChange={(e) => {
                                  const value = parseInt(e.target.value);
                                  field.onChange(value > 0 ? value : 1);
                                }}
                                disabled={form.getValues(`orderItems.${index}.product`) === "Jumbo Roll"}
                                className={cn(
                                  form.getValues(`orderItems.${index}.product`) === "Jumbo Roll" && 
                                  "bg-muted"
                                )}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                      {/* Price and Tax fields */}
                      <div className="col-span-full md:col-span-2 lg:col-span-3 grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name={`orderItems.${index}.price`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                              <FormLabel>Price (Rp) *</FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            inputMode="decimal"
                                  min="0"
                            {...field}
                            value={field.value !== undefined ? field.value.toString() : ''}
                            onChange={e => {
                              // Allow empty field
                              if (!e.target.value) {
                                field.onChange(0);
                                return;
                              }
                              
                              // Only allow numbers and a single decimal point
                              const value = e.target.value;
                              const regex = /^[0-9]*\.?[0-9]*$/;
                              
                              if (regex.test(value)) {
                                // For incomplete decimal input (like "123.") keep as string temporarily
                                const isIncompleteDecimal = value.endsWith('.');
                                
                                if (isIncompleteDecimal) {
                                  field.onChange(value);
                                } else {
                                  // Convert to number for complete inputs
                                  field.onChange(Number(value));
                                }
                              }
                            }}
                            onBlur={(e) => {
                              // When field loses focus, ensure value is converted to number
                              const value = e.target.value;
                              if (value && (typeof value === 'string')) {
                                field.onChange(Number(value));
                              }
                              // Call the original onBlur if it exists
                              if (field.onBlur) field.onBlur();
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`orderItems.${index}.tax`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel>Tax (%)</FormLabel>
                        <FormControl>
                <Input
                  type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                    </div>
                  </div>
                </div>
                )}
              </div>
            ))}
        </div>

          {/* Discount Type and Value Section */}
          <div className="flex justify-end space-x-4 pt-4 border-t">
            <div className="flex items-center gap-4">
              <FormField
                control={form.control}
                name="discountType"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormLabel>Discount Type:</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">Percentage (%)</SelectItem>
                          <SelectItem value="value">Fixed Amount (Rp)</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="discount"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormLabel>Discount{form.watch("discountType") === "percentage" ? " (%)" : " (Rp)"}:</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        className="w-24"
                        {...field}
                        max={form.watch("discountType") === "percentage" ? 100 : undefined}
                        onChange={e => {
                          const value = parseFloat(e.target.value) || 0;
                          // Prevent values over 100 for percentage discounts
                          if (form.watch("discountType") === "percentage" && value > 100) {
                            field.onChange(100);
                          } else {
                            field.onChange(value);
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Order Total with Clear Labeling */}
          <div className="flex justify-end space-x-4 pt-4 border-t">
            {form.watch("discount") > 0 && (
              <div className="flex-col text-right mr-4">
                <div className="text-sm text-muted-foreground">
                  Subtotal: {formatCurrency(calculateOrderTotal() + (form.watch("discountType") === "percentage" 
                    ? calculateOrderTotal() * form.watch("discount") / (100 - form.watch("discount"))
                    : form.watch("discount")
                  ))}
                </div>
                <div className="text-sm text-muted-foreground">
                  {form.watch("discountType") === "percentage" 
                    ? `Discount: ${form.watch("discount")}%`
                    : `Discount: ${formatCurrency(form.watch("discount"))}`
                  }
                </div>
              </div>
            )}
            <div className="text-sm font-medium">Total Amount:</div>
            <div className="text-lg font-semibold">
              {formatCurrency(calculateOrderTotal())}
            </div>
          </div>

          {/* Note Field */}
        <FormField
          control={form.control}
          name="note"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Note</FormLabel>
              <FormControl>
                  <Textarea 
                    {...field} 
                    placeholder="Add any additional notes here..."
                    className="min-h-[100px]"
                  />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
          </div>

        {/* Form Actions */}
        <div className="flex justify-end gap-4 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
            disabled={isLoading}
            >
                Cancel
              </Button>
          <Button 
            type="submit" 
            disabled={isLoading}
            className="min-w-[120px]"
          >
            {isLoading ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
                {initialData ? 'Updating...' : 'Creating...'}
              </>
            ) : (
              <>{initialData ? 'Update' : 'Create'} Order</>
            )}
            </Button>
      </div>
    </form>
    </Form>
  );
} 