import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

    // Validate required fields with specific messages
    const missingFields = [];
    if (!name) missingFields.push('name');
    if (!phone) missingFields.push('phone');
    if (!whatsapp) missingFields.push('whatsapp');
    if (!company) missingFields.push('company');
    if (!address) missingFields.push('address');

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

    // Create customer with validated data
    const customer = await prisma.customer.create({
      data: {
        name: name.trim(),
        email: email?.trim() || null,
        phone: phone.trim(),
        whatsapp: whatsapp.trim(),
        company: company.trim(),
        address: address.trim(),
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

    const customer = await prisma.customer.update({
      where: { id },
      data: {
        name,
        email,
        phone,
        whatsapp,
        company,
        address,
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
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

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