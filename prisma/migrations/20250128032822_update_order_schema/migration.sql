/*
  Warnings:

  - You are about to drop the column `sales` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `tax` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `totalPrice` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the `Divided` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Account" DROP CONSTRAINT "Account_userId_fkey";

-- DropForeignKey
ALTER TABLE "Divided" DROP CONSTRAINT "Divided_inspectedById_fkey";

-- DropForeignKey
ALTER TABLE "Divided" DROP CONSTRAINT "Divided_stockId_fkey";

-- DropForeignKey
ALTER TABLE "InspectionLog" DROP CONSTRAINT "InspectionLog_dividedId_fkey";

-- DropForeignKey
ALTER TABLE "InspectionLog" DROP CONSTRAINT "InspectionLog_userId_fkey";

-- DropForeignKey
ALTER TABLE "Session" DROP CONSTRAINT "Session_userId_fkey";

-- DropForeignKey
ALTER TABLE "Stock" DROP CONSTRAINT "Stock_inspectedById_fkey";

-- DropForeignKey
ALTER TABLE "Task" DROP CONSTRAINT "Task_userId_fkey";

-- DropForeignKey
ALTER TABLE "order_items" DROP CONSTRAINT "order_items_stockId_fkey";

-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "dividedId" TEXT,
ADD COLUMN     "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
ADD COLUMN     "tax" DOUBLE PRECISION NOT NULL DEFAULT 0,
ALTER COLUMN "stockId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "orders" DROP COLUMN "sales",
DROP COLUMN "tax",
DROP COLUMN "totalPrice",
ALTER COLUMN "type" SET DEFAULT 'REGULAR';

-- DropTable
DROP TABLE "Divided";

-- DropTable
DROP TABLE "User";

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "hashedPassword" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "divided" (
    "id" TEXT NOT NULL,
    "rollNo" TEXT NOT NULL,
    "barcodeId" TEXT NOT NULL,
    "width" DOUBLE PRECISION NOT NULL,
    "length" DOUBLE PRECISION NOT NULL,
    "weight" DOUBLE PRECISION,
    "note" TEXT,
    "inspected" BOOLEAN NOT NULL DEFAULT false,
    "inspectedById" TEXT,
    "inspectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "stockId" TEXT NOT NULL,

    CONSTRAINT "divided_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "divided_rollNo_key" ON "divided"("rollNo");

-- CreateIndex
CREATE UNIQUE INDEX "divided_barcodeId_key" ON "divided"("barcodeId");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stock" ADD CONSTRAINT "Stock_inspectedById_fkey" FOREIGN KEY ("inspectedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "divided" ADD CONSTRAINT "divided_stockId_fkey" FOREIGN KEY ("stockId") REFERENCES "Stock"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "divided" ADD CONSTRAINT "divided_inspectedById_fkey" FOREIGN KEY ("inspectedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_stockId_fkey" FOREIGN KEY ("stockId") REFERENCES "Stock"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_dividedId_fkey" FOREIGN KEY ("dividedId") REFERENCES "divided"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InspectionLog" ADD CONSTRAINT "InspectionLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InspectionLog" ADD CONSTRAINT "InspectionLog_dividedId_fkey" FOREIGN KEY ("itemId") REFERENCES "divided"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
