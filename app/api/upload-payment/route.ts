import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { prisma } from "@/lib/prisma";
import { existsSync } from "fs";
import { auth } from "@/auth";
import { recordPaymentWithJournalEntry } from "@/app/lib/finance-service";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const orderId = formData.get("orderId") as string;
    const amount = formData.get("amount") ? parseFloat(formData.get("amount") as string) : 0;
    const notes = formData.get("notes") as string;

    if (!file || !orderId) {
      return NextResponse.json(
        { error: "File and orderId are required" },
        { status: 400 }
      );
    }

    // Get the current user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if order exists
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: true,
        orderItems: true
      }
    });

    if (!order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    // Create images directory if it doesn't exist
    const uploadDir = join(process.cwd(), "public/images/payments");
    
    // Ensure the directory exists
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }
    
    // Generate unique filename
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const filename = `payment-${uniqueSuffix}-${file.name}`;
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Write file
    const filePath = join(uploadDir, filename);
    await writeFile(filePath, buffer);
    
    // The image URL path that will be stored in the reference field
    const imagePath = `/images/payments/${filename}`;

    try {
      // Use the finance service to record payment and create journal entry
      const result = await recordPaymentWithJournalEntry({
        orderId,
        amount: amount || order.totalAmount,
        paymentDate: new Date(),
        paymentMethod: "upload",
        reference: imagePath,
        notes: notes || `Payment uploaded for order ${order.orderNo}`,
        status: "approved"
      });

      return NextResponse.json({ 
        message: "Payment uploaded and processed successfully",
        imageUrl: imagePath,
        payment: result.payment,
        order: result.order
      });
    } catch (serviceError) {
      console.error("Error in finance service:", serviceError);
      
      // If the service fails, still try to save the payment without journal entry
      const payment = await prisma.payment.create({
        data: {
          orderId,
          amount: amount || order.totalAmount,
          paymentDate: new Date(),
          paymentMethod: "upload",
          status: "approved",
          reference: imagePath,
          recordedById: session.user.id,
          notes: notes || `Payment uploaded for order ${order.orderNo}`
        }
      });

      // Update order payment status
      await prisma.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: "paid"
        }
      });

      return NextResponse.json({ 
        message: "Payment uploaded successfully, but journal entry creation failed",
        imageUrl: imagePath,
        payment,
        error: serviceError instanceof Error ? serviceError.message : String(serviceError)
      });
    }
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      { 
        error: "Error uploading file", 
        details: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
} 