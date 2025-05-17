-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "marketingId" TEXT;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_marketingId_fkey" FOREIGN KEY ("marketingId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
