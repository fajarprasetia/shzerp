/*
  Warnings:

  - Added the required column `remainingLength` to the `Stock` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Stock" ADD COLUMN "remainingLength" DOUBLE PRECISION;
UPDATE "Stock" SET "remainingLength" = "length";
ALTER TABLE "Stock" ALTER COLUMN "remainingLength" SET NOT NULL;
