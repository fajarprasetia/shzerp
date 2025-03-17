import { prisma } from "@/lib/prisma";
import { OrderForm } from "../components/order-form";
import { notFound } from "next/navigation";

export default async function EditOrderPage({ params }: { params: { id: string } }) {
  const [order, customers, stocks, dividedStocks] = await Promise.all([
    prisma.order.findUnique({
      where: { id: params.id },
      include: {
        orderItems: true,
      },
    }),
    prisma.customer.findMany({
      orderBy: { name: "asc" },
    }),
    prisma.stock.findMany({
      select: {
        id: true,
        type: true,
        gsm: true,
        width: true,
        length: true,
        weight: true,
        remainingLength: true,
      },
      where: {
        OR: [
          { type: "Sublimation Paper" },
          { type: "Protect Paper" },
          { type: "DTF Film" },
          { type: "Ink" },
        ],
      },
    }),
    prisma.divided.findMany({
      select: {
        id: true,
        width: true,
        length: true,
        weight: true,
        stock: {
          select: {
            gsm: true,
          },
        },
      },
      where: {
        stock: {
          type: "Sublimation Paper",
        },
      },
    }),
  ]);

  if (!order) {
    notFound();
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Edit Order</h1>
      </div>

      <div className="bg-white/60 backdrop-blur-[2px] border rounded-lg p-6">
        <OrderForm 
          customers={customers} 
          stocks={stocks} 
          dividedStocks={dividedStocks.map(d => ({ ...d, gsm: d.stock.gsm }))}
          defaultValues={{
            customerId: order.customerId,
            note: order.note || undefined,
            orderItems: order.orderItems,
          }}
          mode="edit"
        />
      </div>
    </div>
  );
} 