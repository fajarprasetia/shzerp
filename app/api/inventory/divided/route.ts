import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Export configuration to prevent caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * API endpoint to find Divided items that match a specific order number
 * Used as a fallback when the match-order endpoint fails
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const orderNo = url.searchParams.get('orderNo');
    
    if (orderNo) {
      console.log(`Finding sold divided items matching order number: ${orderNo}`);
      
      // Find divided items associated with this order that are marked as sold
      const dividedItems = await prisma.divided.findMany({
        where: {
          orderNo: orderNo,
          isSold: true // Only include items that are marked as sold
        },
        select: {
          id: true,
          barcodeId: true,
          rollNo: true,
          stockId: true,
          width: true,
          length: true,
          isSold: true,
          customerName: true,
          soldDate: true,
          stock: {
            select: {
              gsm: true,
              width: true,
              type: true
            }
          }
        }
      });
      
      console.log(`Found ${dividedItems.length} sold divided items with orderNo: ${orderNo}`);
      return NextResponse.json(dividedItems);
    }
    
    // If no orderNo, return all divided items (used for the order form)
    const divided = await prisma.divided.findMany({
      include: {
        stock: {
          select: {
            jumboRollNo: true,
            type: true,
            gsm: true
          }
        },
        inspectedBy: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });
    
    return NextResponse.json(divided);
  } catch (error) {
    console.error("Error finding divided items:", error);
    return NextResponse.json(
      { error: "Failed to retrieve divided items" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { barcodeId, stockId, width, length, note } = body;

    // Validate input
    if (!barcodeId || !stockId || !width || !length) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Get parent stock
    const stock = await prisma.stock.findUnique({
      where: { id: stockId },
    });

    if (!stock) {
      return NextResponse.json({ error: "Stock not found" }, { status: 404 });
    }

    if (!stock.inspected) {
      return NextResponse.json({ error: "Stock must be inspected first" }, { status: 400 });
    }

    if (length > stock.length) {
      return NextResponse.json({ error: "Divided length cannot be greater than stock length" }, { status: 400 });
    }

    // Generate roll number
    const date = new Date();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    const count = await prisma.divided.count({
      where: {
        rollNo: {
          startsWith: `SHZ-${month}${year}`,
        },
      },
    });
    const rollNo = `SHZ-${month}${year}${String(count + 1).padStart(4, '0')}AA`;

    // Create divided stock and update stock in a transaction
    const [divided] = await prisma.$transaction([
      prisma.divided.create({
        data: {
          rollNo,
          barcodeId,
          stockId,
          width,
          length,
          note,
        },
        include: {
          stock: true,
          inspectedBy: {
            select: {
              name: true,
            },
          },
        },
      }),
      prisma.stock.update({
        where: { id: stockId },
        data: {
          remainingLength: {
            decrement: length,
          },
        },
      }),
    ]);

    return NextResponse.json(divided);
  } catch (error) {
    console.error("Error creating divided stock:", error);
    return NextResponse.json(
      { error: "Error creating divided stock" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const ids = searchParams.get("ids");

    if (ids === "all") {
      // Get all divided stocks to update parent stocks
      const dividedStocks = await prisma.divided.findMany();
      
      // Group by stockId to sum up lengths
      const stockUpdates = dividedStocks.reduce((acc, divided) => {
        acc[divided.stockId] = (acc[divided.stockId] || 0) + divided.length;
        return acc;
      }, {} as Record<string, number>);

      // Update each parent stock and delete all divided stocks in a transaction
      await prisma.$transaction([
        ...Object.entries(stockUpdates).map(([stockId, length]) =>
          prisma.stock.update({
            where: { id: stockId },
            data: {
              remainingLength: {
                increment: length,
              },
            },
          })
        ),
        prisma.divided.deleteMany({}),
      ]);

      return NextResponse.json({ message: "All divided stocks deleted successfully" });
    } else if (ids) {
      const idArray = ids.split(",");
      
      // Get divided stocks to update parent stocks
      const dividedStocks = await prisma.divided.findMany({
        where: {
          id: {
            in: idArray,
          },
        },
      });

      // Group by stockId to sum up lengths
      const stockUpdates = dividedStocks.reduce((acc, divided) => {
        acc[divided.stockId] = (acc[divided.stockId] || 0) + divided.length;
        return acc;
      }, {} as Record<string, number>);

      // Update each parent stock and delete selected divided stocks in a transaction
      await prisma.$transaction([
        ...Object.entries(stockUpdates).map(([stockId, length]) =>
          prisma.stock.update({
            where: { id: stockId },
            data: {
              remainingLength: {
                increment: length,
              },
            },
          })
        ),
        prisma.divided.deleteMany({
          where: {
            id: {
              in: idArray,
            },
          },
        }),
      ]);

      return NextResponse.json({ message: "Selected divided stocks deleted successfully" });
    }

    return NextResponse.json({ error: "No ids provided" }, { status: 400 });
  } catch (error) {
    console.error("Error deleting divided stock:", error);
    return NextResponse.json({ error: "Error deleting divided stock" }, { status: 500 });
  }
} 