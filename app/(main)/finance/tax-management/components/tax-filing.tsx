"use client";

import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { format } from "date-fns";
import { CalendarIcon, Download, FileText, Plus, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

// Tax filing form schema
const taxFilingSchema = z.object({
  taxType: z.string({
    required_error: "Please select a tax type",
  }),
  taxPeriod: z.object({
    year: z.string({
      required_error: "Year is required",
    }),
    month: z.string().optional(),
    quarter: z.string().optional(),
  }),
  dueDate: z.date({
    required_error: "Due date is required",
  }),
  amount: z.coerce.number().min(0, {
    message: "Amount must be a positive number",
  }),
  status: z.string({
    required_error: "Please select a status",
  }),
  notes: z.string().optional(),
});

// Mock tax filings data
const mockTaxFilings = [
  {
    id: "1",
    taxType: "PPN",
    period: "July 2023",
    dueDate: new Date("2023-08-31"),
    amount: 25000000,
    status: "filed",
    filingDate: new Date("2023-08-25"),
    receiptNumber: "PPN-2023-07-12345",
  },
  {
    id: "2",
    taxType: "PPh 21",
    period: "August 2023",
    dueDate: new Date("2023-09-10"),
    amount: 12500000,
    status: "pending",
    filingDate: null,
    receiptNumber: null,
  },
  {
    id: "3",
    taxType: "PPh 23",
    period: "Q2 2023",
    dueDate: new Date("2023-07-20"),
    amount: 8750000,
    status: "filed",
    filingDate: new Date("2023-07-15"),
    receiptNumber: "PPH23-2023-Q2-54321",
  },
  {
    id: "4",
    taxType: "PPh 25",
    period: "September 2023",
    dueDate: new Date("2023-10-15"),
    amount: 15000000,
    status: "overdue",
    filingDate: null,
    receiptNumber: null,
  },
];

export function TaxFiling() {
  const [activeTab, setActiveTab] = useState("upcoming");
  const [taxFilings, setTaxFilings] = useState(mockTaxFilings);
  const [selectedFilings, setSelectedFilings] = useState<string[]>([]);
  const [isAddingFiling, setIsAddingFiling] = useState(false);

  // Form setup
  const form = useForm<z.infer<typeof taxFilingSchema>>({
    resolver: zodResolver(taxFilingSchema),
    defaultValues: {
      taxType: "",
      taxPeriod: {
        year: new Date().getFullYear().toString(),
        month: "",
        quarter: "",
      },
      amount: 0,
      status: "pending",
      notes: "",
    },
  });

  // Filter filings based on active tab
  const filteredFilings = taxFilings.filter((filing) => {
    if (activeTab === "upcoming") {
      return filing.status === "pending";
    } else if (activeTab === "filed") {
      return filing.status === "filed";
    } else if (activeTab === "overdue") {
      return filing.status === "overdue";
    }
    return true;
  });

  // Handle form submission
  const onSubmit = async (values: z.infer<typeof taxFilingSchema>) => {
    try {
      // In a real app, you would send this to your API
      console.log("Submitting tax filing:", values);
      
      // Create a new filing object
      const newFiling = {
        id: Date.now().toString(),
        taxType: values.taxType,
        period: getPeriodDisplay(values.taxPeriod),
        dueDate: values.dueDate,
        amount: values.amount,
        status: values.status,
        filingDate: values.status === "filed" ? new Date() : null,
        receiptNumber: values.status === "filed" ? `${values.taxType}-${values.taxPeriod.year}-${Math.floor(Math.random() * 100000)}` : null,
      };
      
      // Add to the list
      setTaxFilings([...taxFilings, newFiling]);
      
      // Reset form and close
      form.reset();
      setIsAddingFiling(false);
      
      toast({
        title: "Tax filing created",
        description: "The tax filing has been successfully created.",
      });
    } catch (error) {
      console.error("Error creating tax filing:", error);
      toast({
        title: "Error",
        description: "Failed to create tax filing. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Helper to get period display
  const getPeriodDisplay = (period: { year: string; month?: string; quarter?: string }) => {
    if (period.month) {
      const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
      ];
      const monthIndex = parseInt(period.month) - 1;
      return `${monthNames[monthIndex]} ${period.year}`;
    } else if (period.quarter) {
      return `Q${period.quarter} ${period.year}`;
    }
    return period.year;
  };

  // Handle tax type change
  const handleTaxTypeChange = (value: string) => {
    form.setValue("taxType", value);
    
    // Reset period fields based on tax type
    form.setValue("taxPeriod.month", "");
    form.setValue("taxPeriod.quarter", "");
    
    // Set due date based on tax type and current date
    const today = new Date();
    let dueDate = new Date();
    
    if (value === "PPN" || value === "PPh 21") {
      // Monthly taxes are typically due on the 20th of the following month
      dueDate = new Date(today.getFullYear(), today.getMonth() + 1, 20);
    } else if (value === "PPh 23" || value === "PPh 4(2)") {
      // These are typically due on the 10th of the following month
      dueDate = new Date(today.getFullYear(), today.getMonth() + 1, 10);
    } else if (value === "PPh 25") {
      // Corporate income tax installments are due on the 15th of the following month
      dueDate = new Date(today.getFullYear(), today.getMonth() + 1, 15);
    }
    
    form.setValue("dueDate", dueDate);
  };

  // Handle filing status change
  const handleStatusChange = (value: string) => {
    form.setValue("status", value);
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Get status badge color
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "filed":
        return <Badge className="bg-green-500">Filed</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500">Pending</Badge>;
      case "overdue":
        return <Badge className="bg-red-500">Overdue</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Handle checkbox selection
  const handleSelectFiling = (id: string) => {
    setSelectedFilings((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  // Handle select all
  const handleSelectAll = () => {
    if (selectedFilings.length === filteredFilings.length) {
      setSelectedFilings([]);
    } else {
      setSelectedFilings(filteredFilings.map((filing) => filing.id));
    }
  };

  // Handle bulk actions
  const handleMarkAsFiled = () => {
    if (selectedFilings.length === 0) return;
    
    const updatedFilings = taxFilings.map((filing) => {
      if (selectedFilings.includes(filing.id)) {
        return {
          ...filing,
          status: "filed",
          filingDate: new Date(),
          receiptNumber: `${filing.taxType}-${new Date().getFullYear()}-${Math.floor(Math.random() * 100000)}`,
        };
      }
      return filing;
    });
    
    setTaxFilings(updatedFilings);
    setSelectedFilings([]);
    
    toast({
      title: "Tax filings updated",
      description: `${selectedFilings.length} tax filings marked as filed.`,
    });
  };

  return (
    <div className="space-y-6">
      {isAddingFiling ? (
        <Card>
          <CardHeader>
            <CardTitle>Create Tax Filing</CardTitle>
            <CardDescription>
              Add a new tax filing record to track its status and due date
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="taxType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tax Type</FormLabel>
                        <Select 
                          onValueChange={(value) => handleTaxTypeChange(value)} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select tax type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="PPN">PPN (VAT)</SelectItem>
                            <SelectItem value="PPh 21">PPh 21 (Income Tax)</SelectItem>
                            <SelectItem value="PPh 23">PPh 23 (Withholding Tax)</SelectItem>
                            <SelectItem value="PPh 25">PPh 25 (Corporate Income Tax)</SelectItem>
                            <SelectItem value="PPh 4(2)">PPh 4(2) (Final Tax)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="taxPeriod.year"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Year</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select year" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {[...Array(5)].map((_, i) => {
                              const year = new Date().getFullYear() - 2 + i;
                              return (
                                <SelectItem key={year} value={year.toString()}>
                                  {year}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {form.watch("taxType") && (
                    <>
                      {["PPN", "PPh 21", "PPh 25"].includes(form.watch("taxType")) && (
                        <FormField
                          control={form.control}
                          name="taxPeriod.month"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Month</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select month" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="1">January</SelectItem>
                                  <SelectItem value="2">February</SelectItem>
                                  <SelectItem value="3">March</SelectItem>
                                  <SelectItem value="4">April</SelectItem>
                                  <SelectItem value="5">May</SelectItem>
                                  <SelectItem value="6">June</SelectItem>
                                  <SelectItem value="7">July</SelectItem>
                                  <SelectItem value="8">August</SelectItem>
                                  <SelectItem value="9">September</SelectItem>
                                  <SelectItem value="10">October</SelectItem>
                                  <SelectItem value="11">November</SelectItem>
                                  <SelectItem value="12">December</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}

                      {["PPh 23", "PPh 4(2)"].includes(form.watch("taxType")) && (
                        <FormField
                          control={form.control}
                          name="taxPeriod.quarter"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Quarter</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select quarter" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="1">Q1 (Jan-Mar)</SelectItem>
                                  <SelectItem value="2">Q2 (Apr-Jun)</SelectItem>
                                  <SelectItem value="3">Q3 (Jul-Sep)</SelectItem>
                                  <SelectItem value="4">Q4 (Oct-Dec)</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </>
                  )}

                  <FormField
                    control={form.control}
                    name="dueDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Due Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "PPP")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount (IDR)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="0"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select 
                          onValueChange={(value) => handleStatusChange(value)} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="filed">Filed</SelectItem>
                            <SelectItem value="overdue">Overdue</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Add any additional notes about this tax filing"
                            className="resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAddingFiling(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">Create Tax Filing</Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex justify-between items-center">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-[400px]">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                <TabsTrigger value="filed">Filed</TabsTrigger>
                <TabsTrigger value="overdue">Overdue</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="flex space-x-2">
              {selectedFilings.length > 0 && (
                <Button 
                  variant="outline" 
                  onClick={handleMarkAsFiled}
                  className="flex items-center"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Mark as Filed
                </Button>
              )}
              <Button onClick={() => setIsAddingFiling(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Tax Filing
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Tax Filings</CardTitle>
              <CardDescription>
                Manage and track your tax filing obligations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <Checkbox 
                        checked={selectedFilings.length === filteredFilings.length && filteredFilings.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Tax Type</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Filing Date</TableHead>
                    <TableHead>Receipt No.</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFilings.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-6 text-muted-foreground">
                        No tax filings found for this status
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredFilings.map((filing) => (
                      <TableRow key={filing.id}>
                        <TableCell>
                          <Checkbox 
                            checked={selectedFilings.includes(filing.id)}
                            onCheckedChange={() => handleSelectFiling(filing.id)}
                          />
                        </TableCell>
                        <TableCell>{filing.taxType}</TableCell>
                        <TableCell>{filing.period}</TableCell>
                        <TableCell>{format(filing.dueDate, "dd MMM yyyy")}</TableCell>
                        <TableCell>{formatCurrency(filing.amount)}</TableCell>
                        <TableCell>{getStatusBadge(filing.status)}</TableCell>
                        <TableCell>
                          {filing.filingDate ? format(filing.filingDate, "dd MMM yyyy") : "-"}
                        </TableCell>
                        <TableCell>{filing.receiptNumber || "-"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            {filing.status === "filed" && (
                              <Button variant="outline" size="sm">
                                <Download className="h-4 w-4" />
                              </Button>
                            )}
                            {filing.status !== "filed" && (
                              <Button variant="outline" size="sm">
                                <Upload className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
            <CardFooter className="flex justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {filteredFilings.length} tax filings
              </div>
            </CardFooter>
          </Card>
        </>
      )}
    </div>
  );
} 