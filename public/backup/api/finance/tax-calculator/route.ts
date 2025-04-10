import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

// Constants for tax calculations
const PPN_RATE = 0.11; // 11% VAT rate
const PPH_21_RATES = [
  { threshold: 60000000, rate: 0.05 },
  { threshold: 250000000, rate: 0.15 },
  { threshold: 500000000, rate: 0.25 },
  { threshold: Infinity, rate: 0.30 }
];
const PPH_23_RATE = 0.02; // 2% for most services
const PPH_4_2_RATE = 0.1; // 10% for property rental

// PTKP values (non-taxable income) for PPh 21
const PTKP = {
  TK0: 54000000, // Single, no dependents
  K0: 58500000,  // Married, no dependents
  K1: 63000000,  // Married, 1 dependent
  K2: 67500000,  // Married, 2 dependents
  K3: 72000000   // Married, 3 dependents
};

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { 
      taxType, 
      amount, 
      includesTax = false,
      isExport = false,
      annualIncome,
      dependents,
      serviceType
    } = body;

    if (!taxType || amount === undefined) {
      return new NextResponse("Tax type and amount are required", { status: 400 });
    }

    // Get custom tax settings if available
    const taxSettings = await prisma.taxSetting.findMany({
      where: {
        taxType,
      },
    });

    // Convert to a more usable format
    const settings = taxSettings.reduce((acc, setting) => {
      try {
        acc[setting.key] = JSON.parse(setting.value);
      } catch (e) {
        acc[setting.key] = setting.value;
      }
      return acc;
    }, {} as Record<string, any>);

    let result;

    switch (taxType) {
      case "PPN":
        result = calculatePPN(amount, includesTax, isExport, settings);
        break;
      case "PPh 21":
        if (annualIncome === undefined) {
          return new NextResponse("Annual income is required for PPh 21 calculation", { status: 400 });
        }
        result = calculatePPh21(annualIncome, dependents || "TK0", settings);
        break;
      case "PPh 23":
        result = calculatePPh23(amount, serviceType, settings);
        break;
      case "PPh 25":
        result = calculatePPh25(amount, settings);
        break;
      case "PPh 4(2)":
        result = calculatePPh42(amount, settings);
        break;
      default:
        return new NextResponse("Invalid tax type", { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[TAX_CALCULATOR]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

// Calculate PPN (VAT)
function calculatePPN(amount: number, includesTax: boolean, isExport: boolean, settings: Record<string, any>) {
  // For exports, VAT is 0%
  if (isExport) {
    return {
      taxType: "PPN",
      baseAmount: amount,
      taxAmount: 0,
      totalAmount: amount,
      taxRate: 0,
      details: {
        isExport: true,
        message: "Exports are subject to 0% VAT"
      }
    };
  }

  // Use custom rate if available, otherwise use default
  const rate = settings.rate ? parseFloat(settings.rate) : PPN_RATE;

  let baseAmount, taxAmount;

  if (includesTax) {
    // If amount includes tax, we need to extract the base amount
    baseAmount = amount / (1 + rate);
    taxAmount = amount - baseAmount;
  } else {
    // If amount doesn't include tax, calculate tax on top
    baseAmount = amount;
    taxAmount = amount * rate;
  }

  return {
    taxType: "PPN",
    baseAmount,
    taxAmount,
    totalAmount: baseAmount + taxAmount,
    taxRate: rate * 100,
    details: {
      includesTax,
      isExport
    }
  };
}

// Calculate PPh 21 (Income Tax)
function calculatePPh21(annualIncome: number, dependentStatus: string, settings: Record<string, any>) {
  // Get PTKP based on dependent status
  const ptkpValue = PTKP[dependentStatus as keyof typeof PTKP] || PTKP.TK0;
  
  // Use custom PTKP if available
  const customPtkp = settings[`ptkp_${dependentStatus.toLowerCase()}`];
  const effectivePtkp = customPtkp ? parseFloat(customPtkp) : ptkpValue;
  
  // Calculate taxable income
  const taxableIncome = Math.max(0, annualIncome - effectivePtkp);
  
  // Use custom rates if available, otherwise use default
  const rates = settings.rates ? settings.rates : PPH_21_RATES;
  
  // Calculate tax progressively
  let remainingIncome = taxableIncome;
  let totalTax = 0;
  
  const taxBreakdown = [];
  
  for (const { threshold, rate } of rates) {
    const bracketAmount = Math.min(remainingIncome, threshold);
    if (bracketAmount <= 0) break;
    
    const bracketTax = bracketAmount * rate;
    totalTax += bracketTax;
    
    taxBreakdown.push({
      bracket: threshold,
      amount: bracketAmount,
      rate: rate * 100,
      tax: bracketTax
    });
    
    remainingIncome -= bracketAmount;
    if (remainingIncome <= 0) break;
  }
  
  return {
    taxType: "PPh 21",
    annualIncome,
    ptkp: effectivePtkp,
    taxableIncome,
    taxAmount: totalTax,
    effectiveRate: taxableIncome > 0 ? (totalTax / annualIncome) * 100 : 0,
    monthlyTax: totalTax / 12,
    details: {
      dependentStatus,
      taxBreakdown
    }
  };
}

// Calculate PPh 23 (Withholding Tax)
function calculatePPh23(amount: number, serviceType: string, settings: Record<string, any>) {
  // Use custom rate if available based on service type
  let rate = PPH_23_RATE;
  
  if (settings[`rate_${serviceType}`]) {
    rate = parseFloat(settings[`rate_${serviceType}`]);
  } else if (settings.rate) {
    rate = parseFloat(settings.rate);
  }
  
  const taxAmount = amount * rate;
  
  return {
    taxType: "PPh 23",
    baseAmount: amount,
    taxAmount,
    totalAmount: amount - taxAmount, // Withholding tax is deducted
    taxRate: rate * 100,
    details: {
      serviceType
    }
  };
}

// Calculate PPh 25 (Corporate Income Tax Installments)
function calculatePPh25(amount: number, settings: Record<string, any>) {
  // Corporate tax rate is typically 22% in Indonesia
  const rate = settings.rate ? parseFloat(settings.rate) : 0.22;
  
  const taxAmount = amount * rate;
  
  return {
    taxType: "PPh 25",
    baseAmount: amount,
    taxAmount,
    totalAmount: amount + taxAmount,
    taxRate: rate * 100,
    details: {
      note: "This is an estimated corporate income tax installment"
    }
  };
}

// Calculate PPh 4(2) (Final Tax)
function calculatePPh42(amount: number, settings: Record<string, any>) {
  // Use custom rate if available
  const rate = settings.rate ? parseFloat(settings.rate) : PPH_4_2_RATE;
  
  const taxAmount = amount * rate;
  
  return {
    taxType: "PPh 4(2)",
    baseAmount: amount,
    taxAmount,
    totalAmount: amount + taxAmount,
    taxRate: rate * 100,
    details: {
      note: "This is a final tax calculation"
    }
  };
} 