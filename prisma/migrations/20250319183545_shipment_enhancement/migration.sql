/*
  Warnings:

  - Added the required column `remainingLength` to the `divided` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "divided" ADD COLUMN     "remainingLength" DOUBLE PRECISION NOT NULL;

-- AlterTable
ALTER TABLE "shipment_items" ADD COLUMN     "dividedId" TEXT,
ADD COLUMN     "scannedBarcode" TEXT,
ADD COLUMN     "stockId" TEXT;

-- AddForeignKey
ALTER TABLE "shipment_items" ADD CONSTRAINT "shipment_items_stockId_fkey" FOREIGN KEY ("stockId") REFERENCES "Stock"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_items" ADD CONSTRAINT "shipment_items_dividedId_fkey" FOREIGN KEY ("dividedId") REFERENCES "divided"("id") ON DELETE SET NULL ON UPDATE CASCADE;
