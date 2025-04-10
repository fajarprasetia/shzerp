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
import { Checkbox } from "@/components/ui/checkbox";
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
import { Loader2, Plus, Trash2 } from "lucide-react";

// Indonesian tax types
const TAX_TYPES = [
  { id: "ppn", name: "PPN (Pajak Pertambahan Nilai)", description: "Value Added Tax" },
  { id: "pph21", name: "PPh 21", description: "Income Tax Article 21" },
  { id: "pph23", name: "PPh 23", description: "Income Tax Article 23" },
  { id: "pph25", name: "PPh 25", description: "Income Tax Article 25" },
  { id: "pph4_2", name: "PPh 4(2)", description: "Final Income Tax Article 4(2)" },
];

// Form schema for general tax settings
const generalTaxSchema = z.object({
  companyNPWP: z.string().min(1, "NPWP is required"),
  taxPeriodStart: z.string().min(1, "Tax period start is required"),
  taxPeriodEnd: z.string().min(1, "Tax period end is required"),
  taxFilingEmail: z.string().email("Invalid email address"),
  enableAutomaticCalculation: z.boolean().default(true),
  defaultTaxRate: z.coerce.number().min(0).max(100),
});

// Form schema for PPN (VAT) settings
const ppnSchema = z.object({
  enabled: z.boolean().default(true),
  rate: z.coerce.number().min(0).max(100),
  applyToAllSales: z.boolean().default(true),
  exemptExports: z.boolean().default(true),
});

// Form schema for PPh 21 (Income Tax) settings
const pph21Schema = z.object({
  enabled: z.boolean().default(true),
  useProgressiveRates: z.boolean().default(true),
  rates: z.array(
    z.object({
      threshold: z.coerce.number().min(0),
      rate: z.coerce.number().min(0).max(100),
    })
  ),
});

// Form schema for PPh 23 settings
const pph23Schema = z.object({
  enabled: z.boolean().default(true),
  defaultRate: z.coerce.number().min(0).max(100),
  applyToServices: z.boolean().default(true),
  applyToRoyalties: z.boolean().default(true),
});

type GeneralTaxFormValues = z.infer<typeof generalTaxSchema>;
type PPNFormValues = z.infer<typeof ppnSchema>;
type PPh21FormValues = z.infer<typeof pph21Schema>;
type PPh23FormValues = z.infer<typeof pph23Schema>;

export function TaxSettings() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);
  const [activeTaxTab, setActiveTaxTab] = React.useState("general");

  // General tax settings form
  const generalForm = useForm<GeneralTaxFormValues>({
    resolver: zodResolver(generalTaxSchema),
    defaultValues: {
      companyNPWP: "",
      taxPeriodStart: "01-01",
      taxPeriodEnd: "12-31",
      taxFilingEmail: "",
      enableAutomaticCalculation: true,
      defaultTaxRate: 11, // Default PPN rate in Indonesia
    },
  });

  // PPN (VAT) settings form
  const ppnForm = useForm<PPNFormValues>({
    resolver: zodResolver(ppnSchema),
    defaultValues: {
      enabled: true,
      rate: 11, // Current PPN rate in Indonesia
      applyToAllSales: true,
      exemptExports: true,
    },
  });

  // PPh 21 (Income Tax) settings form
  const pph21Form = useForm<PPh21FormValues>({
    resolver: zodResolver(pph21Schema),
    defaultValues: {
      enabled: true,
      useProgressiveRates: true,
      rates: [
        { threshold: 0, rate: 5 },
        { threshold: 50000000, rate: 15 },
        { threshold: 250000000, rate: 25 },
        { threshold: 500000000, rate: 30 },
      ],
    },
  });

  // PPh 23 settings form
  const pph23Form = useForm<PPh23FormValues>({
    resolver: zodResolver(pph23Schema),
    defaultValues: {
      enabled: true,
      defaultRate: 2, // Default PPh 23 rate
      applyToServices: true,
      applyToRoyalties: true,
    },
  });

  // Load tax settings from API
  React.useEffect(() => {
    const loadTaxSettings = async () => {
      try {
        setIsLoading(true);
        // Fetch tax settings from API
        const response = await fetch("/api/finance/tax-settings");
        
        if (response.ok) {
          const data = await response.json();
          
          // Update form values with fetched data
          if (data.general) {
            generalForm.reset(data.general);
          }
          
          if (data.ppn) {
            ppnForm.reset(data.ppn);
          }
          
          if (data.pph21) {
            pph21Form.reset(data.pph21);
          }
          
          if (data.pph23) {
            pph23Form.reset(data.pph23);
          }
        }
      } catch (error) {
        console.error("Failed to load tax settings:", error);
        toast({
          title: "Error",
          description: "Failed to load tax settings. Using default values.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadTaxSettings();
  }, [generalForm, ppnForm, pph21Form, pph23Form, toast]);

  // Handle form submissions
  const onSubmitGeneral = async (values: GeneralTaxFormValues) => {
    try {
      setIsLoading(true);
      
      // Save general tax settings
      const response = await fetch("/api/finance/tax-settings/general", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });
      
      if (!response.ok) {
        throw new Error("Failed to save general tax settings");
      }
      
      toast({
        title: "Success",
        description: "General tax settings saved successfully",
      });
    } catch (error) {
      console.error("Error saving general tax settings:", error);
      toast({
        title: "Error",
        description: "Failed to save general tax settings",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmitPPN = async (values: PPNFormValues) => {
    try {
      setIsLoading(true);
      
      // Save PPN settings
      const response = await fetch("/api/finance/tax-settings/ppn", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });
      
      if (!response.ok) {
        throw new Error("Failed to save PPN settings");
      }
      
      toast({
        title: "Success",
        description: "PPN settings saved successfully",
      });
    } catch (error) {
      console.error("Error saving PPN settings:", error);
      toast({
        title: "Error",
        description: "Failed to save PPN settings",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmitPPh21 = async (values: PPh21FormValues) => {
    try {
      setIsLoading(true);
      
      // Save PPh 21 settings
      const response = await fetch("/api/finance/tax-settings/pph21", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });
      
      if (!response.ok) {
        throw new Error("Failed to save PPh 21 settings");
      }
      
      toast({
        title: "Success",
        description: "PPh 21 settings saved successfully",
      });
    } catch (error) {
      console.error("Error saving PPh 21 settings:", error);
      toast({
        title: "Error",
        description: "Failed to save PPh 21 settings",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmitPPh23 = async (values: PPh23FormValues) => {
    try {
      setIsLoading(true);
      
      // Save PPh 23 settings
      const response = await fetch("/api/finance/tax-settings/pph23", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });
      
      if (!response.ok) {
        throw new Error("Failed to save PPh 23 settings");
      }
      
      toast({
        title: "Success",
        description: "PPh 23 settings saved successfully",
      });
    } catch (error) {
      console.error("Error saving PPh 23 settings:", error);
      toast({
        title: "Error",
        description: "Failed to save PPh 23 settings",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Add a new PPh 21 tax rate bracket
  const addPPh21Rate = () => {
    const currentRates = pph21Form.getValues("rates") || [];
    pph21Form.setValue("rates", [
      ...currentRates,
      { threshold: 0, rate: 0 },
    ]);
  };

  // Remove a PPh 21 tax rate bracket
  const removePPh21Rate = (index: number) => {
    const currentRates = pph21Form.getValues("rates") || [];
    pph21Form.setValue(
      "rates",
      currentRates.filter((_, i) => i !== index)
    );
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTaxTab} onValueChange={setActiveTaxTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="ppn">PPN (VAT)</TabsTrigger>
          <TabsTrigger value="pph21">PPh 21</TabsTrigger>
          <TabsTrigger value="pph23">PPh 23</TabsTrigger>
        </TabsList>

        {/* General Tax Settings */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>General Tax Settings</CardTitle>
              <CardDescription>
                Configure your company's general tax settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...generalForm}>
                <form
                  id="general-tax-form"
                  onSubmit={generalForm.handleSubmit(onSubmitGeneral)}
                  className="space-y-4"
                >
                  <FormField
                    control={generalForm.control}
                    name="companyNPWP"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company NPWP</FormLabel>
                        <FormControl>
                          <Input placeholder="XX.XXX.XXX.X-XXX.XXX" {...field} />
                        </FormControl>
                        <FormDescription>
                          Your company's tax identification number
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={generalForm.control}
                      name="taxPeriodStart"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tax Period Start</FormLabel>
                          <FormControl>
                            <Input placeholder="MM-DD" {...field} />
                          </FormControl>
                          <FormDescription>
                            Start date of your tax year (MM-DD)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={generalForm.control}
                      name="taxPeriodEnd"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tax Period End</FormLabel>
                          <FormControl>
                            <Input placeholder="MM-DD" {...field} />
                          </FormControl>
                          <FormDescription>
                            End date of your tax year (MM-DD)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={generalForm.control}
                    name="taxFilingEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tax Filing Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="tax@yourcompany.com"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Email address for tax filing notifications
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={generalForm.control}
                    name="defaultTaxRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Default Tax Rate (%)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Default tax rate to apply when no specific rate is set
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={generalForm.control}
                    name="enableAutomaticCalculation"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Enable Automatic Tax Calculation</FormLabel>
                          <FormDescription>
                            Automatically calculate taxes on invoices and bills
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                </form>
              </Form>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button
                type="submit"
                form="general-tax-form"
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save General Settings
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* PPN (VAT) Settings */}
        <TabsContent value="ppn">
          <Card>
            <CardHeader>
              <CardTitle>PPN (Value Added Tax) Settings</CardTitle>
              <CardDescription>
                Configure settings for Pajak Pertambahan Nilai (VAT)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...ppnForm}>
                <form
                  id="ppn-form"
                  onSubmit={ppnForm.handleSubmit(onSubmitPPN)}
                  className="space-y-4"
                >
                  <FormField
                    control={ppnForm.control}
                    name="enabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Enable PPN</FormLabel>
                          <FormDescription>
                            Apply PPN (Value Added Tax) to applicable transactions
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={ppnForm.control}
                    name="rate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>PPN Rate (%)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Standard PPN rate (currently 11% in Indonesia)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={ppnForm.control}
                    name="applyToAllSales"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Apply to All Sales</FormLabel>
                          <FormDescription>
                            Automatically apply PPN to all sales transactions
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={ppnForm.control}
                    name="exemptExports"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Exempt Exports</FormLabel>
                          <FormDescription>
                            Do not apply PPN to export transactions
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                </form>
              </Form>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button type="submit" form="ppn-form" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save PPN Settings
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* PPh 21 (Income Tax) Settings */}
        <TabsContent value="pph21">
          <Card>
            <CardHeader>
              <CardTitle>PPh 21 (Income Tax) Settings</CardTitle>
              <CardDescription>
                Configure settings for Pajak Penghasilan Article 21
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...pph21Form}>
                <form
                  id="pph21-form"
                  onSubmit={pph21Form.handleSubmit(onSubmitPPh21)}
                  className="space-y-4"
                >
                  <FormField
                    control={pph21Form.control}
                    name="enabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Enable PPh 21</FormLabel>
                          <FormDescription>
                            Apply PPh 21 (Income Tax) to applicable transactions
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={pph21Form.control}
                    name="useProgressiveRates"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Use Progressive Rates</FormLabel>
                          <FormDescription>
                            Apply progressive tax rates based on income thresholds
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  {pph21Form.watch("useProgressiveRates") && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium">Tax Rate Brackets</h3>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addPPh21Rate}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Add Bracket
                        </Button>
                      </div>

                      {pph21Form.watch("rates")?.map((_, index) => (
                        <div
                          key={index}
                          className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end border rounded-md p-4"
                        >
                          <FormField
                            control={pph21Form.control}
                            name={`rates.${index}.threshold`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Income Threshold (IDR)</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    min="0"
                                    step="1000000"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={pph21Form.control}
                            name={`rates.${index}.rate`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Tax Rate (%)</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.1"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            onClick={() => removePPh21Rate(index)}
                            className="mb-2"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </form>
              </Form>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button type="submit" form="pph21-form" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save PPh 21 Settings
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* PPh 23 Settings */}
        <TabsContent value="pph23">
          <Card>
            <CardHeader>
              <CardTitle>PPh 23 Settings</CardTitle>
              <CardDescription>
                Configure settings for Pajak Penghasilan Article 23
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...pph23Form}>
                <form
                  id="pph23-form"
                  onSubmit={pph23Form.handleSubmit(onSubmitPPh23)}
                  className="space-y-4"
                >
                  <FormField
                    control={pph23Form.control}
                    name="enabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Enable PPh 23</FormLabel>
                          <FormDescription>
                            Apply PPh 23 to applicable transactions
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={pph23Form.control}
                    name="defaultRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Default PPh 23 Rate (%)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Standard PPh 23 rate (typically 2% in Indonesia)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={pph23Form.control}
                    name="applyToServices"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Apply to Services</FormLabel>
                          <FormDescription>
                            Automatically apply PPh 23 to service transactions
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={pph23Form.control}
                    name="applyToRoyalties"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Apply to Royalties</FormLabel>
                          <FormDescription>
                            Automatically apply PPh 23 to royalty payments
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                </form>
              </Form>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button type="submit" form="pph23-form" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save PPh 23 Settings
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 