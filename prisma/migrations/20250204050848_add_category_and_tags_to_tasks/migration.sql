-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "category" TEXT NOT NULL DEFAULT 'work',
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];
