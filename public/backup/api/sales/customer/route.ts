import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Helper function to format phone numbers
function formatPhoneNumber(phone: string): string {
  if (!phone) return phone;
  
  // Remove all non-digits
  let cleaned = phone.replace(/\D/g, '');
  
  // Replace leading 0 with 62 (Indonesia country code)
  if (cleaned.startsWith('0')) {
    cleaned = `62${cleaned.substring(1)}`;
  }
  
  return cleaned;
}

export async function GET() {
  try {
    const customers = await prisma.customer.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });
    return NextResponse.json(customers);
  } catch (error) {
    console.error("Error fetching customers:", error);
    return NextResponse.json({ error: "Error fetching customers" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log('Received body:', body); // Debug log

    const { name, email, phone, whatsapp, company, address } = body;

    // Validate only required fields: name and phone
    const missingFields = [];
    if (!name) missingFields.push('name');
    if (!phone) missingFields.push('phone');

    if (missingFields.length > 0) {
      return NextResponse.json(
        { 
          error: `Missing required fields: ${missingFields.join(', ')}`,
          fields: missingFields 
        },
        { status: 400 }
      );
    }

    // Validate email format if provided
    if (email && !email.includes('@')) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Format phone numbers
    const formattedPhone = formatPhoneNumber(phone);
    const formattedWhatsapp = whatsapp ? formatPhoneNumber(whatsapp) : null;

    // Create customer with validated data
    const customer = await prisma.customer.create({
      data: {
        name: name.trim(),
        email: email?.trim() || null,
        phone: formattedPhone,
        whatsapp: formattedWhatsapp,
        company: company?.trim() || null,
        address: address?.trim() || null,
      },
    });

    return NextResponse.json({
      message: "Customer created successfully",
      customer
    });
  } catch (error) {
    console.error("Error creating customer:", error);
    
    // Handle Prisma-specific errors
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create customer" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const data = await request.json();
    const { id, name, email, phone, whatsapp, company, address } = data;

    // Validate required fields
    if (!id || !name || !phone) {
      return NextResponse.json({ error: "ID, name, and phone are required" }, { status: 400 });
    }

    // Check if customer exists
    const existingCustomer = await prisma.customer.findUnique({
      where: { id },
    });

    if (!existingCustomer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    // Format phone numbers
    const formattedPhone = formatPhoneNumber(phone);
    const formattedWhatsapp = whatsapp ? formatPhoneNumber(whatsapp) : null;

    const customer = await prisma.customer.update({
      where: { id },
      data: {
        name,
        email: email || null,
        phone: formattedPhone,
        whatsapp: formattedWhatsapp,
        company: company || null,
        address: address || null,
      },
    });
    return NextResponse.json(customer);
  } catch (error) {
    console.error("Error updating customer:", error);
    return NextResponse.json({ error: "Error updating customer" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    // Get ID from request body instead of query params
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: "Customer ID is required" }, { status: 400 });
    }

    // Check if customer exists
    const existingCustomer = await prisma.customer.findUnique({
      where: { id },
    });

    if (!existingCustomer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    // Check if customer has orders
    const customerOrders = await prisma.order.findFirst({
      where: { customerId: id },
    });

    if (customerOrders) {
      return NextResponse.json(
        { error: "Cannot delete customer with existing orders" },
        { status: 400 }
      );
    }

    await prisma.customer.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting customer:", error);
    return NextResponse.json({ error: "Error deleting customer" }, { status: 500 });
  }
} 