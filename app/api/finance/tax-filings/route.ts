import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

// GET handler to retrieve tax filings
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const taxType = searchParams.get("taxType");
    const year = searchParams.get("year");
    const month = searchParams.get("month");
    const quarter = searchParams.get("quarter");

    // Build the query filters
    const filters: any = {};

    if (status) {
      filters.status = status;
    }

    if (taxType) {
      filters.taxType = taxType;
    }

    if (year) {
      filters.taxPeriod = {
        contains: year,
      };

      if (month) {
        // Further filter by month
        filters.taxPeriod = {
          contains: `${year}-${month.padStart(2, "0")}`,
        };
      } else if (quarter) {
        // Filter by quarter
        filters.taxPeriod = {
          contains: `Q${quarter} ${year}`,
        };
      }
    }

    // Fetch tax filings from the database
    const taxFilings = await prisma.taxFiling.findMany({
      where: filters,
      orderBy: {
        dueDate: "desc",
      },
      include: {
        attachments: true,
      },
    });

    return NextResponse.json(taxFilings);
  } catch (error) {
    console.error("[TAX_FILINGS_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

// POST handler to create a new tax filing
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { 
      taxType, 
      taxPeriod, 
      dueDate, 
      amount, 
      status = "pending",
      notes,
      receiptNumber,
      filingDate
    } = body;

    if (!taxType || !taxPeriod || !dueDate || amount === undefined) {
      return new NextResponse("Required fields are missing", { status: 400 });
    }

    // Format the tax period based on the type
    let formattedPeriod = "";
    if (taxPeriod.month) {
      const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
      ];
      const monthIndex = parseInt(taxPeriod.month) - 1;
      formattedPeriod = `${monthNames[monthIndex]} ${taxPeriod.year}`;
    } else if (taxPeriod.quarter) {
      formattedPeriod = `Q${taxPeriod.quarter} ${taxPeriod.year}`;
    } else {
      formattedPeriod = taxPeriod.year;
    }

    // Create the tax filing
    const taxFiling = await prisma.taxFiling.create({
      data: {
        taxType,
        taxPeriod: formattedPeriod,
        dueDate: new Date(dueDate),
        amount: parseFloat(amount.toString()),
        status,
        notes,
        receiptNumber,
        filingDate: filingDate ? new Date(filingDate) : null,
        userId: session.user.id,
      },
    });

    return NextResponse.json(taxFiling);
  } catch (error) {
    console.error("[TAX_FILINGS_POST]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

// PATCH handler to update a tax filing
export async function PATCH(req: Request) {
  try {
    const session = await auth();
    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { id, status, receiptNumber, filingDate, notes } = body;

    if (!id) {
      return new NextResponse("Tax filing ID is required", { status: 400 });
    }

    // Update the tax filing
    const updatedFiling = await prisma.taxFiling.update({
      where: {
        id,
      },
      data: {
        ...(status && { status }),
        ...(receiptNumber && { receiptNumber }),
        ...(filingDate && { filingDate: new Date(filingDate) }),
        ...(notes !== undefined && { notes }),
      },
    });

    return NextResponse.json(updatedFiling);
  } catch (error) {
    console.error("[TAX_FILINGS_PATCH]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
} 