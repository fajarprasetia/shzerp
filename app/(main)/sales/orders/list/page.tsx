import { prisma } from "@/lib/prisma";
import { OrderList } from "../components/order-list";

export default async function OrderListPage() {
  const orders = await prisma.order.findMany({
    include: {
      customer: true,
      orderItems: {
        include: {
          stock: true,
          divided: true,
        }
      }
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  return <OrderList initialOrders={orders} />;
} 