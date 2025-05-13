import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

// Prevent caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Helper function to get a valid user ID to use for the shipment record
 * This tries to use the authenticated user, then system user, then admin user
 */
async function getValidUserId() {
  try {
    // Get the current user session
    const session = await auth();
    
    // If we have an authenticated user, use that
    if (session?.user?.id) {
      return session.user.id;
    }
    
    // Otherwise, look for a system user
    const systemUser = await prisma.user.findFirst({
      where: {
        isSystemUser: true
      }
    });
    
    if (systemUser) {
      return systemUser.id;
    }
    
    // As a last resort, find any admin user
    const adminUser = await prisma.user.findFirst({
      where: {
        isSystemAdmin: true
      }
    });
    
    if (adminUser) {
      return adminUser.id;
    }
    
    // If we still don't have a user, create a default system user
    const defaultUser = await prisma.user.findFirst();
    
    if (defaultUser) {
      return defaultUser.id;
    }
    
    // If all else fails, throw an error
    throw new Error("No valid user found for shipment record");
  } catch (error) {
    console.error("Error getting valid user ID:", error);
    throw error;
  }
}

/**
 * API endpoint to record a scan event for an order item
 * This records the scanned item in the database so it can be retrieved if the page is refreshed
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { orderId, orderItemId, barcodeValue, stockId, dividedId } = body;

    if (!orderId || !orderItemId || !barcodeValue) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    // First, verify the order and order item exist
    const orderItem = await prisma.orderItem.findUnique({
      where: { 
        id: orderItemId,
      },
      include: {
        order: {
          include: {
            customer: true
          }
        }
      }
    });

    if (!orderItem || orderItem.order.id !== orderId) {
      return NextResponse.json(
        { error: "Order item not found or does not belong to the specified order" },
        { status: 404 }
      );
    }

    // Check if this barcode has already been recorded for this order
    const existingRecord = await prisma.shipmentItem.findFirst({
      where: {
        orderItemId: orderItemId,
        scannedBarcode: barcodeValue
      }
    });

    if (existingRecord) {
      // Already recorded, return success with a note
      return NextResponse.json({
        success: true,
        message: "Scan already recorded",
        scanRecord: existingRecord
      });
    }

    // Get or create a temporary shipment record for in-progress scans
    // This is needed because ShipmentItem requires a shipment relationship
    let tempShipment = await prisma.shipment.findFirst({
      where: {
        orderId: orderId,
        // Using 'as any' temporarily to avoid TypeScript error until schema is updated
        status: 'IN_PROGRESS' as any
      }
    });

    if (!tempShipment) {
      // Get a valid user ID for the shipment record
      const userId = await getValidUserId();
      
      // Create a temporary shipment record for tracking scans
      tempShipment = await prisma.shipment.create({
        data: {
          order: {
            connect: {
              id: orderId
            }
          },
          shipmentDate: new Date(), // Current date as default
          shippedByUser: {
            connect: {
              id: userId
            }
          },
          notes: "Auto-created during scan process",
          // Using 'as any' temporarily to avoid TypeScript error until schema is updated
          status: 'IN_PROGRESS' as any
        }
      });
    }

    // Create a new scan record
    const scanRecord = await prisma.shipmentItem.create({
      data: {
        scannedBarcode: barcodeValue,
        // Connect to the temporary shipment
        shipment: {
          connect: {
            id: tempShipment.id
          }
        },
        // Connect to the order item using the proper relation syntax
        orderItem: {
          connect: {
            id: orderItemId
          }
        },
        // Connect to stock or divided if provided
        ...(stockId 
          ? { 
              stock: { 
                connect: { 
                  id: stockId 
                } 
              } 
            } 
          : {}),
        ...(dividedId 
          ? { 
              divided: { 
                connect: { 
                  id: dividedId 
                } 
              } 
            } 
          : {}),
      }
    });

    // Get all scan records for this order item to count how many times it's been scanned
    const allScans = await prisma.shipmentItem.findMany({
      where: {
        orderItemId: orderItemId
      }
    });

    // Update the order item with the scan count and tracking information
    await prisma.orderItem.update({
      where: { id: orderItemId },
      data: {
        // Store the total number of scans for this item
        scannedCount: allScans.length as any,
        // Store the related IDs if provided
        ...(stockId ? { stockId } : {}),
        ...(dividedId ? { dividedId } : {})
      }
    });

    // Update tracking info in the order
    await prisma.order.update({
      where: { id: orderId },
      data: {
        // Update status if needed - this is just a status update, not marking the order as shipped
        status: 'IN_PROGRESS',
        updatedAt: new Date()
      }
    });

    // Immediately mark the item as sold in the appropriate table
    if (stockId) {
      try {
        await prisma.stock.update({
          where: { id: stockId },
          data: {
            isSold: true,
            orderNo: orderItem.order.orderNo,
            soldDate: new Date(),
            customerName: orderItem.order.customer?.name || "Unknown Customer"
          }
        });
        console.log(`[RECORD_SCAN] Successfully marked stock ${stockId} as sold`);
      } catch (err) {
        console.error(`[RECORD_SCAN] Error marking stock as sold:`, err);
      }
    }

    if (dividedId) {
      try {
        await prisma.divided.update({
          where: { id: dividedId },
          data: {
            isSold: true,
            orderNo: orderItem.order.orderNo,
            soldDate: new Date(),
            customerName: orderItem.order.customer?.name || "Unknown Customer"
          }
        });
        console.log(`[RECORD_SCAN] Successfully marked divided item ${dividedId} as sold`);
      } catch (err) {
        console.error(`[RECORD_SCAN] Error marking divided item as sold:`, err);
      }
    }

    // Check if all items for this order have been scanned - query database for accurate counts
    const orderWithItems = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: true
      }
    });

    let isComplete = false;
    if (orderWithItems) {
      // Check if all items have been scanned according to their required quantities
      const totalRequired = orderWithItems.orderItems.reduce(
        (sum, item) => sum + (item.quantity || 0), 0
      );
      
      const totalScanned = orderWithItems.orderItems.reduce(
        (sum, item) => sum + ((item as any).scannedCount || 0), 0
      );
      
      isComplete = totalScanned >= totalRequired && totalRequired > 0;
      
      // Update shipping status in response
      console.log(`[RECORD_SCAN] Order scan progress: ${totalScanned}/${totalRequired} (${isComplete ? 'Complete' : 'Incomplete'})`);
    }

    return NextResponse.json({
      success: true,
      message: "Scan recorded successfully",
      scanRecord: scanRecord,
      tempShipment: tempShipment,
      orderStatus: isComplete ? 'READY_TO_SHIP' : 'IN_PROGRESS'
    });
  } catch (error) {
    console.error("Error recording scan:", error);
    return NextResponse.json(
      { error: "Failed to record scan" },
      { status: 500 }
    );
  }
} 