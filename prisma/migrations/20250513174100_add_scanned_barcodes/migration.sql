-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "scannedBarcodes" TEXT[] DEFAULT ARRAY[]::TEXT[];
