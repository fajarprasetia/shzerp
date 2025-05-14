import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const ids = searchParams.get("ids");

    // If ids parameter exists, fetch only those stocks
    if (ids) {
      const idArray = ids.split(',');
      const stocks = await prisma.stock.findMany({
        where: {
          id: {
            in: idArray
          }
        },
        include: {
          inspectedBy: {
            select: {
              name: true,
            },
          },
        },
      });

      // Map inspectedBy to inspector for frontend compatibility
      const mappedStocks = stocks.map(stock => ({
        ...stock,
        inspector: stock.inspectedBy
      }));

      return NextResponse.json(mappedStocks);
    }

    // If no ids parameter, fetch all stocks (original behavior)
    const stocks = await prisma.stock.findMany({
      include: {
        inspectedBy: {
          select: {
            name: true,
          },
        },
      },
      orderBy: [
        { isSold: "asc" },
        { createdAt: "desc" },
      ],
    });

    // Map inspectedBy to inspector for frontend compatibility
    const mappedStocks = stocks.map(stock => ({
      ...stock,
      inspector: stock.inspectedBy
    }));

    console.log("Fetched stocks:", mappedStocks); // Debug log
    return NextResponse.json(mappedStocks);
  } catch (error) {
    console.error("Error fetching stocks:", error);
    return NextResponse.json({ error: "Error fetching stocks" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();

    // Validate required fields
    if (!data.barcodeId || !data.type || !data.gsm || !data.width || !data.length || !data.weight || !data.containerNo) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Generate jumbo roll number
    const date = new Date();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    const count = await prisma.stock.count({
      where: {
        jumboRollNo: {
          startsWith: `SHZ${year}${month}`,
        },
      },
    });
    const jumboRollNo = `SHZ${year}${month}${String(count + 1).padStart(4, '0')}`;

    const stock = await prisma.stock.create({
      data: {
        jumboRollNo,
        barcodeId: data.barcodeId,
        type: data.type,
        gsm: data.gsm,
        width: data.width,
        length: data.length,
        remainingLength: data.length,
        weight: data.weight,
        containerNo: data.containerNo,
        arrivalDate: data.arrivalDate || new Date(),
        note: data.note,
      },
      include: {
        inspectedBy: {
          select: {
            name: true,
          },
        },
      },
    });

    // Map inspectedBy to inspector for frontend compatibility
    const mappedStock = {
      ...stock,
      inspector: stock.inspectedBy
    };

    return NextResponse.json(mappedStock);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error creating stock";
    console.error("Error creating stock:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const data = await request.json();

    if (!data.id) {
      return NextResponse.json({ error: "Stock ID is required" }, { status: 400 });
    }

    // Check if stock exists
    const existingStock = await prisma.stock.findUnique({
      where: { id: data.id },
    });

    if (!existingStock) {
      return NextResponse.json({ error: "Stock not found" }, { status: 404 });
    }

    const stock = await prisma.stock.update({
      where: {
        id: data.id,
      },
      data: {
        type: data.type,
        gsm: data.gsm,
        width: data.width,
        length: data.length,
        weight: data.weight,
        containerNo: data.containerNo,
        arrivalDate: data.arrivalDate ? new Date(data.arrivalDate) : undefined,
        note: data.note,
      },
      include: {
        inspectedBy: {
          select: {
            name: true,
          },
        },
      },
    });

    // Map inspectedBy to inspector for frontend compatibility
    const mappedStock = {
      ...stock,
      inspector: stock.inspectedBy
    };

    return NextResponse.json(mappedStock);
  } catch (error) {
    console.error("Error updating stock:", error);
    return NextResponse.json({ error: "Error updating stock" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    // Check if there's a body payload for batch deletion
    if (request.headers.get('content-type')?.includes('application/json')) {
      // Batch deletion
      const { ids } = await request.json();
      
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return NextResponse.json({ error: "No valid IDs provided" }, { status: 400 });
      }
      
      // Delete multiple stocks
      await prisma.stock.deleteMany({
        where: {
          id: {
            in: ids
          }
        }
      });
      
      return NextResponse.json({ success: true });
    } else {
      // Single item deletion via query parameter
      const { searchParams } = new URL(request.url);
      const id = searchParams.get("id");

      if (!id) {
        return NextResponse.json({ error: "Stock ID is required" }, { status: 400 });
      }

      await prisma.stock.delete({
        where: {
          id,
        },
      });

      return NextResponse.json({ success: true });
    }
  } catch (error) {
    console.error("Error deleting stock:", error);
    return NextResponse.json({ error: "Error deleting stock" }, { status: 500 });
  }
} 