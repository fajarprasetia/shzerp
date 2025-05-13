import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
        order: true
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
        status: 'IN_PROGRESS'
      }
    });

    if (!tempShipment) {
      // Create a temporary shipment record for tracking scans
      tempShipment = await prisma.shipment.create({
        data: {
          order: {
            connect: {
              id: orderId
            }
          },
          status: 'IN_PROGRESS',
          processedById: null // Will be updated when shipment is completed
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

    return NextResponse.json({
      success: true,
      message: "Scan recorded successfully",
      scanRecord: scanRecord,
      tempShipment: tempShipment
    });
  } catch (error) {
    console.error("Error recording scan:", error);
    return NextResponse.json(
      { error: "Failed to record scan" },
      { status: 500 }
    );
  }
} 