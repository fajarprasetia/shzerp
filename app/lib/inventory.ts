import { Stock } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function scanBarcode(): Promise<string> {
  try {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Camera access is not supported in this browser");
    }

    // Request camera access
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });

    // Create video element
    const video = document.createElement("video");
    video.srcObject = stream;
    await video.play();

    // Create canvas
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Could not get canvas context");
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Stop video stream
    stream.getTracks().forEach(track => track.stop());

    // For now, return a mock barcode for testing
    // In production, you would use a barcode scanning library here
    return "TEST-BARCODE-123";
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Camera access error: ${error.message}`);
    }
    throw new Error("Failed to access camera");
  }
}

export async function generateJumboRollNo(): Promise<string> {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2);
  const count = await prisma.stock.count({
    where: {
      jumboRollNo: {
        startsWith: `SHZ-${month}${year}`,
      },
    },
  });
  return `SHZ-${month}${year}${String(count + 1).padStart(4, '0')}`;
}

export function calculateDividedRolls(parentLength: number, count: number): { lengthPerRoll: number, remainingLength: number } {
  const lengthPerRoll = Math.floor(parentLength / count);
  const remainingLength = parentLength - (lengthPerRoll * count);
  return { lengthPerRoll, remainingLength };
}

export function generateDividedRollNo(jumboRollNo: string, index: number): string {
  return `${jumboRollNo}${String(index + 1).padStart(2, 'A')}`;
}

export async function validateStockBarcode(barcodeId: string): Promise<Stock | null> {
  try {
    const response = await fetch(`/api/inventory/stock/validate?barcodeId=${barcodeId}`);
    if (!response.ok) {
      throw new Error('Invalid barcode');
    }
    return response.json();
  } catch (error) {
    throw error;
  }
} 