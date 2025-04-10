import { Stock, Divided } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import jsQR from "jsqr";

export interface ScanBarcodeResult {
  success: boolean;
  data: string;
  error?: string;
}

export interface CameraDevice {
  deviceId: string;
  label: string;
  facingMode?: string;
}

export async function scanBarcode(useBackCamera: boolean = true): Promise<ScanBarcodeResult> {
  try {
    if (!navigator.mediaDevices?.getUserMedia) {
      return {
        success: false,
        data: "",
        error: "Camera access is not supported in this browser"
      };
    }

    // Request camera access with specified camera preference
    const facingMode = useBackCamera ? "environment" : "user";
    const constraints = {
      video: { 
        facingMode,
        width: { ideal: 1280 },
        height: { ideal: 720 }
      }
    };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);

    // Create video element
    const video = document.createElement("video");
    video.srcObject = stream;
    video.setAttribute("playsinline", "true"); // Required for iOS Safari
    
    // Create scanning element container
    const scannerContainer = document.createElement("div");
    scannerContainer.style.position = "fixed";
    scannerContainer.style.top = "0";
    scannerContainer.style.left = "0";
    scannerContainer.style.width = "100%";
    scannerContainer.style.height = "100%";
    scannerContainer.style.zIndex = "9999";
    scannerContainer.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
    scannerContainer.style.display = "flex";
    scannerContainer.style.flexDirection = "column";
    scannerContainer.style.justifyContent = "center";
    scannerContainer.style.alignItems = "center";
    
    // Create video container with scanning overlay
    const videoContainer = document.createElement("div");
    videoContainer.style.position = "relative";
    videoContainer.style.width = "80%";
    videoContainer.style.maxWidth = "400px";
    videoContainer.style.aspectRatio = "1";
    videoContainer.style.border = "2px solid white";
    videoContainer.style.borderRadius = "8px";
    videoContainer.style.overflow = "hidden";
    
    // Create scanning line animation
    const scanLine = document.createElement("div");
    scanLine.style.position = "absolute";
    scanLine.style.left = "0";
    scanLine.style.width = "100%";
    scanLine.style.height = "2px";
    scanLine.style.backgroundColor = "red";
    scanLine.style.animation = "scan 2s infinite linear";
    
    // Add animation keyframes
    const style = document.createElement("style");
    style.textContent = `
      @keyframes scan {
        0% { top: 0; }
        50% { top: 100%; }
        100% { top: 0; }
      }
    `;
    document.head.appendChild(style);
    
    // Create canvas for capturing frames
    const canvas = document.createElement("canvas");
    const canvasContext = canvas.getContext("2d", { willReadFrequently: true });
    
    // Create cancel button
    const cancelButton = document.createElement("button");
    cancelButton.textContent = "Cancel";
    cancelButton.style.marginTop = "20px";
    cancelButton.style.padding = "10px 20px";
    cancelButton.style.border = "none";
    cancelButton.style.borderRadius = "4px";
    cancelButton.style.backgroundColor = "white";
    cancelButton.style.color = "black";
    cancelButton.style.cursor = "pointer";
    
    // Add elements to DOM
    videoContainer.appendChild(video);
    videoContainer.appendChild(scanLine);
    scannerContainer.appendChild(videoContainer);
    scannerContainer.appendChild(cancelButton);
    document.body.appendChild(scannerContainer);
    
    // Set up promise to resolve with scanned barcode
    return new Promise((resolve) => {
      // Handle cancel button
      cancelButton.onclick = () => {
        cleanup();
        resolve({
          success: false,
          data: "",
          error: "Scanning cancelled by user"
        });
      };

      // Cleanup function
      const cleanup = () => {
        cancelAnimation();
        stream.getTracks().forEach(track => track.stop());
        if (scannerContainer.parentNode) {
          scannerContainer.parentNode.removeChild(scannerContainer);
        }
        document.head.removeChild(style);
      };

      // Start video
      video.onloadedmetadata = () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        video.play().catch(err => {
          cleanup();
          resolve({
            success: false,
            data: "",
            error: `Failed to play video: ${err.message}`
          });
        });
      };

      let animationId: number;
      const cancelAnimation = () => {
        if (animationId) {
          cancelAnimationFrame(animationId);
        }
      };

      // Process video frames
      const processFrame = () => {
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
          // Draw video frame to canvas
          canvasContext?.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          // Get image data for QR code scanning
          const imageData = canvasContext?.getImageData(0, 0, canvas.width, canvas.height);
          
          if (imageData) {
            // Try to detect QR code in the image
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: "dontInvert",
            });
            
            if (code) {
              // We found a QR code
              cleanup();
              resolve({
                success: true,
                data: code.data
              });
              return;
            }
          }
        }
        
        // Continue scanning
        animationId = requestAnimationFrame(processFrame);
      };

      // Start processing frames
      animationId = requestAnimationFrame(processFrame);
      
      // Set timeout for scanning (30 seconds)
      setTimeout(() => {
        cleanup();
        resolve({
          success: false,
          data: "",
          error: "Barcode scanning timed out. Please try again."
        });
      }, 30000);
    });
  } catch (error) {
    return {
      success: false,
      data: "",
      error: error instanceof Error ? error.message : "Failed to access camera"
    };
  }
}

export async function generateJumboRollNo(): Promise<string> {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2);
  const count = await prisma.stock.count({
    where: {
      jumboRollNo: {
        startsWith: `SHZ${year}${month}`,
      },
    },
  });
  return `SHZ${year}${month}${String(count + 1).padStart(4, '0')}`;
}

export function calculateDividedRolls(parentLength: number, count: number): { lengthPerRoll: number, remainingLength: number } {
  const lengthPerRoll = Math.floor(parentLength / count);
  const remainingLength = parentLength - (lengthPerRoll * count);
  return { lengthPerRoll, remainingLength };
}

export function generateDividedRollNo(jumboRollNo: string, index: number): string {
  // Add alphabet directly to the jumbo roll number (A, B, C, ...)
  return `${jumboRollNo}${String.fromCharCode(65 + index)}`;
}

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function validateStockBarcode(barcode: string): Promise<ValidationResult<Stock>> {
  try {
    if (!barcode) {
      return {
        success: false,
        error: "Barcode ID is required"
      };
    }

    const response = await fetch(`/api/inventory/stock/validate?barcode=${barcode}`);
    
    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        error: errorData.error || "Invalid barcode"
      };
    }

    const data = await response.json();
    return {
      success: true,
      data
    };
  } catch (error) {
    console.error("Error validating stock barcode:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to validate barcode"
    };
  }
}

export async function validateDividedBarcode(barcodeId: string): Promise<ValidationResult<Divided>> {
  try {
    const response = await fetch(`/api/inventory/divided/validate?barcodeId=${barcodeId}`);
    const data = await response.json();
    
    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Invalid barcode'
      };
    }
    
    return {
      success: true,
      data: data
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to validate barcode'
    };
  }
} 