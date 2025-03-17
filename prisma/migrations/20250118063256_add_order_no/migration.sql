/*
  Warnings:

  - You are about to drop the column `productionDate` on the `Divided` table. All the data in the column will be lost.
  - You are about to drop the column `weight` on the `Divided` table. All the data in the column will be lost.
  - You are about to drop the column `customerId` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `invoiceNo` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `note` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `orderDate` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `price` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `tax` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `category` on the `Task` table. All the data in the column will be lost.
  - You are about to drop the column `tags` on the `Task` table. All the data in the column will be lost.
  - You are about to drop the column `avatar` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `password` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `Customer` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[orderNo]` on the table `Order` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `orderNo` to the `Order` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_customerId_fkey";

-- DropForeignKey
ALTER TABLE "Task" DROP CONSTRAINT "Task_userId_fkey";

-- DropIndex
DROP INDEX "Order_invoiceNo_key";

-- AlterTable
ALTER TABLE "Divided" DROP COLUMN "productionDate",
DROP COLUMN "weight",
ALTER COLUMN "width" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "length" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "customerId",
DROP COLUMN "invoiceNo",
DROP COLUMN "note",
DROP COLUMN "orderDate",
DROP COLUMN "price",
DROP COLUMN "tax",
ADD COLUMN     "orderNo" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Stock" ALTER COLUMN "gsm" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "width" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "length" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Task" DROP COLUMN "category",
DROP COLUMN "tags",
ALTER COLUMN "dueDate" DROP NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "avatar",
DROP COLUMN "password",
ADD COLUMN     "emailVerified" TIMESTAMP(3),
ADD COLUMN     "hashedPassword" TEXT,
ADD COLUMN     "image" TEXT;

-- DropTable
DROP TABLE "Customer";

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InspectionLog" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "itemType" TEXT NOT NULL,
    "itemIdentifier" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InspectionLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE INDEX "InspectionLog_itemType_itemId_idx" ON "InspectionLog"("itemType", "itemId");

-- CreateIndex
CREATE INDEX "InspectionLog_createdAt_idx" ON "InspectionLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Order_orderNo_key" ON "Order"("orderNo");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InspectionLog" ADD CONSTRAINT "InspectionLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InspectionLog" ADD CONSTRAINT "InspectionLog_stockId_fkey" FOREIGN KEY ("itemId") REFERENCES "Stock"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InspectionLog" ADD CONSTRAINT "InspectionLog_dividedId_fkey" FOREIGN KEY ("itemId") REFERENCES "Divided"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
