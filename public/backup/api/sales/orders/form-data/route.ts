import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Add debug log
    console.log('Fetching form data from database...');

    const [customers, stocks, dividedStocks] = await Promise.all([
      prisma.customer.findMany({
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          phone: true,
        },
      }),
      prisma.stock.findMany({
        where: {
          type: {
            in: ["Sublimation Paper", "Protect Paper", "DTF Film", "Ink"]
          },
          remainingLength: {
            gt: 0
          }
        },
        select: {
          id: true,
          type: true,
          gsm: true,
          width: true,
          length: true,
          weight: true,
          remainingLength: true,
        },
      }),
      prisma.divided.findMany({
        where: {
          length: {
            gt: 0
          },
          stock: {
            type: "Sublimation Paper"
          }
        },
        select: {
          id: true,
          width: true,
          length: true,
          weight: true,
          stock: {
            select: {
              id: true,
              type: true,
              gsm: true,
            }
          }
        }
      })
    ]);

    // Add debug logs
    console.log('Fetched data:', {
      customersCount: customers.length,
      stocksCount: stocks.length,
      dividedStocksCount: dividedStocks.length
    });

    const response = {
      customers,
      stocks,
      dividedStocks: dividedStocks.map(d => ({
        ...d,
        gsm: d.stock.gsm,
        remainingLength: d.length
      }))
    };

    console.log('Sending response:', response);

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error in form-data route:", error);
    return new NextResponse(
      JSON.stringify({ 
        error: "Failed to fetch form data",
        details: error instanceof Error ? error.message : 'Unknown error'
      }), 
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
} 