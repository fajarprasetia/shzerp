/*
  Warnings:

  - You are about to drop the column `createdById` on the `JournalEntry` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "JournalEntry" DROP CONSTRAINT "JournalEntry_createdById_fkey";

-- DropIndex
DROP INDEX "JournalEntry_createdById_idx";

-- AlterTable
ALTER TABLE "JournalEntry" DROP COLUMN "createdById";
