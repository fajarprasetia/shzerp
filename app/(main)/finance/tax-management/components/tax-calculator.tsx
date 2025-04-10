"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Calculator } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

// Tax calculator form schema
const taxCalculatorSchema = z.object({
  taxType: z.enum(["ppn", "pph21", "pph23", "pph4_2"]),
  amount: z.coerce.number().positive("Amount must be positive"),
  includesTax: z.boolean().optional(),
  isExport: z.boolean().optional(),
  monthlyIncome: z.coerce.number().optional(),
  annualIncome: z.coerce.number().optional(),
  dependents: z.coerce.number().min(0).optional(),
  isPTKP: z.boolean().optional(),
  serviceType: z.string().optional(),
});

type TaxCalculatorFormValues = z.infer<typeof taxCalculatorSchema>;

// PPh 21 PTKP values (non-taxable income thresholds) in IDR
const PTKP_VALUES = {
  TK0: 54000000, // Single, no dependents
  TK1: 58500000, // Single, 1 dependent
  TK2: 63000000, // Single, 2 dependents
  TK3: 67500000, // Single, 3 dependents
  K0: 58500000, // Married, no dependents
  K1: 63000000, // Married, 1 dependent
  K2: 67500000, // Married, 2 dependents
  K3: 72000000, // Married, 3 dependents
};

// PPh 23 service types and rates
const PPH23_SERVICES = [
  { id: "rental", name: "Rental (non-land/building)", rate: 2 },
  { id: "technical", name: "Technical Services", rate: 2 },
  { id: "management", name: "Management Services", rate: 2 },
  { id: "consulting", name: "Consulting Services", rate: 2 },
  { id: "prize", name: "Prizes and Awards", rate: 15 },
  { id: "royalty", name: "Royalties", rate: 15 },
];

// PPh 4(2) types and rates
const PPH4_2_TYPES = [
  { id: "rental_land", name: "Land/Building Rental", rate: 10 },
  { id: "construction", name: "Construction Services", rate: 2 },
  { id: "property_sale", name: "Property Sale", rate: 2.5 },
  { id: "interest", name: "Interest on Deposits", rate: 20 },
];

export function TaxCalculator() {
  const { toast } = useToast();
  const [isCalculating, setIsCalculating] = React.useState(false);
  const [calculationResult, setCalculationResult] = React.useState<{
    taxAmount: number;
    netAmount: number;
    grossAmount: number;
    effectiveRate: number;
    breakdown?: any;
  } | null>(null);

  // Form with default values
  const form = useForm<TaxCalculatorFormValues>({
    resolver: zodResolver(taxCalculatorSchema),
    defaultValues: {
      taxType: "ppn",
      amount: 0,
      includesTax: false,
      isExport: false,
      monthlyIncome: 0,
      annualIncome: 0,
      dependents: 0,
      isPTKP: false,
      serviceType: "",
    },
  });

  // Watch for form value changes
  const watchTaxType = form.watch("taxType");
  const watchAmount = form.watch("amount");
  const watchIncludesTax = form.watch("includesTax");
  const watchIsExport = form.watch("isExport");
  const watchDependents = form.watch("dependents");
  const watchIsPTKP = form.watch("isPTKP");
  const watchServiceType = form.watch("serviceType");

  // Calculate tax based on form values
  const calculateTax = async (values: TaxCalculatorFormValues) => {
    setIsCalculating(true);
    try {
      // In a real application, you might want to call an API for this
      // For now, we'll calculate it directly in the client
      
      let taxAmount = 0;
      let netAmount = 0;
      let grossAmount = values.amount;
      let effectiveRate = 0;
      let breakdown = {};
      
      switch (values.taxType) {
        case "ppn":
          // PPN (VAT) calculation
          const ppnRate = 0.11; // 11%
          
          if (values.isExport) {
            // Exports are typically VAT-free
            taxAmount = 0;
            netAmount = values.amount;
            effectiveRate = 0;
          } else if (values.includesTax) {
            // If amount includes tax, extract the tax
            taxAmount = values.amount - (values.amount / (1 + ppnRate));
            netAmount = values.amount - taxAmount;
            effectiveRate = (taxAmount / netAmount) * 100;
          } else {
            // If amount excludes tax, calculate the tax
            taxAmount = values.amount * ppnRate;
            netAmount = values.amount;
            grossAmount = values.amount + taxAmount;
            effectiveRate = ppnRate * 100;
          }
          break;
          
        case "pph21":
          // PPh 21 (Income Tax) calculation
          let annualIncome = values.annualIncome || (values.monthlyIncome ? values.monthlyIncome * 12 : 0);
          
          if (values.isPTKP) {
            // Apply PTKP (non-taxable income threshold)
            const ptkpKey = `${values.dependents <= 3 ? values.dependents : 3}`;
            const ptkpValue = PTKP_VALUES[`TK${ptkpKey}` as keyof typeof PTKP_VALUES];
            
            // Subtract PTKP from annual income
            annualIncome = Math.max(0, annualIncome - ptkpValue);
          }
          
          // Progressive tax calculation
          let remainingIncome = annualIncome;
          let totalTax = 0;
          breakdown = {};
          
          // First bracket: 0-50 million (5%)
          const bracket1 = Math.min(remainingIncome, 50000000);
          const tax1 = bracket1 * 0.05;
          remainingIncome -= bracket1;
          totalTax += tax1;
          breakdown = { ...breakdown, "5% bracket": tax1 };
          
          // Second bracket: 50-250 million (15%)
          if (remainingIncome > 0) {
            const bracket2 = Math.min(remainingIncome, 200000000);
            const tax2 = bracket2 * 0.15;
            remainingIncome -= bracket2;
            totalTax += tax2;
            breakdown = { ...breakdown, "15% bracket": tax2 };
          }
          
          // Third bracket: 250-500 million (25%)
          if (remainingIncome > 0) {
            const bracket3 = Math.min(remainingIncome, 250000000);
            const tax3 = bracket3 * 0.25;
            remainingIncome -= bracket3;
            totalTax += tax3;
            breakdown = { ...breakdown, "25% bracket": tax3 };
          }
          
          // Fourth bracket: Above 500 million (30%)
          if (remainingIncome > 0) {
            const tax4 = remainingIncome * 0.3;
            totalTax += tax4;
            breakdown = { ...breakdown, "30% bracket": tax4 };
          }
          
          taxAmount = totalTax;
          netAmount = annualIncome;
          grossAmount = annualIncome + totalTax;
          effectiveRate = annualIncome > 0 ? (totalTax / annualIncome) * 100 : 0;
          break;
          
        case "pph23":
          // PPh 23 calculation
          const selectedService = PPH23_SERVICES.find(s => s.id === values.serviceType);
          const pph23Rate = selectedService ? selectedService.rate / 100 : 0.02; // Default to 2%
          
          taxAmount = values.amount * pph23Rate;
          netAmount = values.amount;
          grossAmount = values.amount + taxAmount;
          effectiveRate = pph23Rate * 100;
          break;
          
        case "pph4_2":
          // PPh 4(2) calculation
          const selectedType = PPH4_2_TYPES.find(t => t.id === values.serviceType);
          const pph4_2Rate = selectedType ? selectedType.rate / 100 : 0.1; // Default to 10%
          
          taxAmount = values.amount * pph4_2Rate;
          netAmount = values.amount;
          grossAmount = values.amount + taxAmount;
          effectiveRate = pph4_2Rate * 100;
          break;
      }
      
      setCalculationResult({
        taxAmount,
        netAmount,
        grossAmount,
        effectiveRate,
        breakdown,
      });
      
      toast({
        title: "Tax Calculation Complete",
        description: `Tax amount: ${formatCurrency(taxAmount)}`,
      });
    } catch (error) {
      console.error("Error calculating tax:", error);
      toast({
        title: "Calculation Error",
        description: "There was an error calculating the tax.",
        variant: "destructive",
      });
    } finally {
      setIsCalculating(false);
    }
  };

  // Format currency for display
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Tax Calculator</CardTitle>
          <CardDescription>
            Calculate different types of Indonesian taxes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              id="tax-calculator-form"
              onSubmit={form.handleSubmit(calculateTax)}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="taxType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tax Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select tax type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ppn">PPN (VAT)</SelectItem>
                        <SelectItem value="pph21">PPh 21 (Income Tax)</SelectItem>
                        <SelectItem value="pph23">PPh 23</SelectItem>
                        <SelectItem value="pph4_2">PPh 4(2)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Select the type of tax you want to calculate
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* PPN (VAT) specific fields */}
              {watchTaxType === "ppn" && (
                <>
                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount (IDR)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            step="1000"
                            placeholder="Enter amount"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          {watchIncludesTax
                            ? "Amount including PPN"
                            : "Amount excluding PPN"}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="includesTax"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Amount Includes PPN</FormLabel>
                          <FormDescription>
                            Check if the amount already includes PPN
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="isExport"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Export Transaction</FormLabel>
                          <FormDescription>
                            Check if this is an export transaction (typically PPN-free)
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                </>
              )}

              {/* PPh 21 (Income Tax) specific fields */}
              {watchTaxType === "pph21" && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="monthlyIncome"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Monthly Income (IDR)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              step="100000"
                              placeholder="Monthly income"
                              {...field}
                              onChange={(e) => {
                                field.onChange(e);
                                const monthlyValue = parseFloat(e.target.value) || 0;
                                form.setValue("annualIncome", monthlyValue * 12);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="annualIncome"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Annual Income (IDR)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              step="1000000"
                              placeholder="Annual income"
                              {...field}
                              onChange={(e) => {
                                field.onChange(e);
                                const annualValue = parseFloat(e.target.value) || 0;
                                form.setValue("monthlyIncome", annualValue / 12);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="isPTKP"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Apply PTKP</FormLabel>
                          <FormDescription>
                            Apply non-taxable income threshold (PTKP)
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  {watchIsPTKP && (
                    <FormField
                      control={form.control}
                      name="dependents"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Number of Dependents</FormLabel>
                          <Select
                            onValueChange={(value) => field.onChange(parseInt(value))}
                            defaultValue={field.value.toString()}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select number of dependents" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="0">0 (TK0)</SelectItem>
                              <SelectItem value="1">1 (TK1)</SelectItem>
                              <SelectItem value="2">2 (TK2)</SelectItem>
                              <SelectItem value="3">3+ (TK3)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Number of dependents affects your PTKP amount
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </>
              )}

              {/* PPh 23 specific fields */}
              {watchTaxType === "pph23" && (
                <>
                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Transaction Amount (IDR)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            step="1000"
                            placeholder="Enter amount"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="serviceType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Service Type</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select service type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {PPH23_SERVICES.map((service) => (
                              <SelectItem key={service.id} value={service.id}>
                                {service.name} ({service.rate}%)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Different service types have different PPh 23 rates
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              {/* PPh 4(2) specific fields */}
              {watchTaxType === "pph4_2" && (
                <>
                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Transaction Amount (IDR)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            step="1000"
                            placeholder="Enter amount"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="serviceType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Transaction Type</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select transaction type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {PPH4_2_TYPES.map((type) => (
                              <SelectItem key={type.id} value={type.id}>
                                {type.name} ({type.rate}%)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Different transaction types have different PPh 4(2) rates
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button
            type="submit"
            form="tax-calculator-form"
            disabled={isCalculating}
          >
            {isCalculating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Calculator className="mr-2 h-4 w-4" />
            )}
            Calculate Tax
          </Button>
        </CardFooter>
      </Card>

      {/* Results Card */}
      <Card>
        <CardHeader>
          <CardTitle>Calculation Results</CardTitle>
          <CardDescription>
            Tax calculation summary and breakdown
          </CardDescription>
        </CardHeader>
        <CardContent>
          {calculationResult ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Net Amount
                  </h3>
                  <p className="text-2xl font-bold">
                    {formatCurrency(calculationResult.netAmount)}
                  </p>
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Tax Amount
                  </h3>
                  <p className="text-2xl font-bold text-primary">
                    {formatCurrency(calculationResult.taxAmount)}
                  </p>
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Gross Amount
                  </h3>
                  <p className="text-2xl font-bold">
                    {formatCurrency(calculationResult.grossAmount)}
                  </p>
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Effective Rate
                  </h3>
                  <p className="text-2xl font-bold">
                    {calculationResult.effectiveRate.toFixed(2)}%
                  </p>
                </div>
              </div>

              {/* Tax Breakdown for PPh 21 */}
              {watchTaxType === "pph21" && calculationResult.breakdown && (
                <div className="mt-6">
                  <h3 className="text-sm font-medium mb-2">Tax Breakdown</h3>
                  <div className="space-y-2 rounded-md border p-4">
                    {Object.entries(calculationResult.breakdown).map(
                      ([bracket, amount]) => (
                        <div
                          key={bracket}
                          className="flex justify-between items-center"
                        >
                          <span>{bracket}</span>
                          <span className="font-medium">
                            {formatCurrency(amount as number)}
                          </span>
                        </div>
                      )
                    )}
                    <div className="pt-2 mt-2 border-t flex justify-between items-center font-bold">
                      <span>Total Tax</span>
                      <span>{formatCurrency(calculationResult.taxAmount)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-[300px] text-center">
              <Calculator className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No Calculation Yet</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Fill out the form and click "Calculate Tax" to see results
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 