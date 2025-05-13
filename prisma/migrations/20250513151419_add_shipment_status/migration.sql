-- CreateEnum
CREATE TYPE "ShipmentStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- AlterTable
ALTER TABLE "shipments" ADD COLUMN     "status" "ShipmentStatus" NOT NULL DEFAULT 'IN_PROGRESS';
