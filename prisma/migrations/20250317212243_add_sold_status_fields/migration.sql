-- AlterTable
ALTER TABLE "Stock" ADD COLUMN     "customerName" TEXT,
ADD COLUMN     "isSold" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "orderNo" TEXT,
ADD COLUMN     "soldDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "divided" ADD COLUMN     "customerName" TEXT,
ADD COLUMN     "isSold" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "orderNo" TEXT,
ADD COLUMN     "soldDate" TIMESTAMP(3);
