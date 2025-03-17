/*
  Warnings:

  - You are about to drop the column `isRecurring` on the `budgets` table. All the data in the column will be lost.
  - You are about to drop the column `notificationThreshold` on the `budgets` table. All the data in the column will be lost.
  - You are about to drop the column `notifications` on the `budgets` table. All the data in the column will be lost.
  - You are about to drop the column `recurringPeriod` on the `budgets` table. All the data in the column will be lost.
  - You are about to drop the column `spent` on the `budgets` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `financial_accounts` table. All the data in the column will be lost.
  - You are about to drop the column `total` on the `order_items` table. All the data in the column will be lost.
  - You are about to alter the column `quantity` on the `order_items` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - You are about to drop the column `status` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `orders` table. All the data in the column will be lost.
  - Added the required column `period` to the `budgets` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `customers` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "InspectionLog" DROP CONSTRAINT "InspectionLog_dividedId_fkey";

-- DropForeignKey
ALTER TABLE "InspectionLog" DROP CONSTRAINT "InspectionLog_stockId_fkey";

-- AlterTable
ALTER TABLE "InspectionLog" ADD COLUMN     "dividedId" TEXT,
ADD COLUMN     "note" TEXT,
ADD COLUMN     "stockId" TEXT,
ALTER COLUMN "itemId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "budgets" DROP COLUMN "isRecurring",
DROP COLUMN "notificationThreshold",
DROP COLUMN "notifications",
DROP COLUMN "recurringPeriod",
DROP COLUMN "spent",
ADD COLUMN     "alertThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0.8,
ADD COLUMN     "period" TEXT NOT NULL,
ALTER COLUMN "startDate" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "endDate" DROP NOT NULL;

-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "email" DROP NOT NULL;

-- AlterTable
ALTER TABLE "financial_accounts" DROP COLUMN "isActive",
ADD COLUMN     "lowBalanceAlert" DOUBLE PRECISION,
ALTER COLUMN "currency" SET DEFAULT 'IDR';

-- AlterTable
ALTER TABLE "order_items" DROP COLUMN "total",
ALTER COLUMN "quantity" SET DEFAULT 1,
ALTER COLUMN "quantity" SET DATA TYPE INTEGER,
ALTER COLUMN "gsm" SET DATA TYPE TEXT,
ALTER COLUMN "length" SET DATA TYPE TEXT,
ALTER COLUMN "weight" SET DATA TYPE TEXT,
ALTER COLUMN "width" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "orders" DROP COLUMN "status",
DROP COLUMN "type",
ALTER COLUMN "totalAmount" SET DEFAULT 0;

-- CreateTable
CREATE TABLE "finance_notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "finance_notifications_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "InspectionLog" ADD CONSTRAINT "InspectionLog_stockId_fkey" FOREIGN KEY ("stockId") REFERENCES "Stock"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InspectionLog" ADD CONSTRAINT "InspectionLog_dividedId_fkey" FOREIGN KEY ("dividedId") REFERENCES "divided"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_notifications" ADD CONSTRAINT "finance_notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
