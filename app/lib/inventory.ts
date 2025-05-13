import { Stock, Divided } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import jsQR from "jsqr";
import { BrowserMultiFormatReader, Result, BarcodeFormat, Exception } from '@zxing/library';

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

export interface ScanOptions {
  tryHarder?: boolean;
  timeout?: number;
  scanInterval?: number;
  enableProgressBar?: boolean;
  showCameraSelection?: boolean;
}

export async function scanBarcode(useBackCamera: boolean = true, options?: ScanOptions): Promise<ScanBarcodeResult> {
  return new Promise((resolve) => {
    try {
      // Create modal container
      const modalContainer = document.createElement('div');
      modalContainer.style.position = 'fixed';
      modalContainer.style.top = '0';
      modalContainer.style.left = '0';
      modalContainer.style.width = '100%';
      modalContainer.style.height = '100%';
      modalContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
      modalContainer.style.zIndex = '9999';
      modalContainer.style.display = 'flex';
      modalContainer.style.flexDirection = 'column';
      modalContainer.style.justifyContent = 'center';
      modalContainer.style.alignItems = 'center';
      
      // Create video element for preview
      const previewElem = document.createElement('video');
      previewElem.style.maxWidth = '90%';
      previewElem.style.maxHeight = '70%';
      previewElem.style.borderRadius = '8px';
      previewElem.style.border = '2px solid #444';
      previewElem.style.backgroundColor = '#000';
      
      // Create scanning guide overlay
      const overlay = document.createElement('div');
      overlay.style.position = 'absolute';
      overlay.style.width = '80%';
      overlay.style.height = '80%';
      overlay.style.maxWidth = '500px';
      overlay.style.maxHeight = '400px';
      overlay.style.border = '2px dashed #fff';
      overlay.style.borderRadius = '8px';
      overlay.style.boxSizing = 'border-box';
      overlay.style.pointerEvents = 'none';
      
      // Create scan line animation
      const scanLine = document.createElement('div');
      scanLine.style.position = 'absolute';
      scanLine.style.width = '100%';
      scanLine.style.height = '2px';
      scanLine.style.background = 'red';
      scanLine.style.animation = 'scan-line-animation 2s infinite';
      
      // Add scan line animation style
      const style = document.createElement('style');
      style.textContent = `
        @keyframes scan-line-animation {
          0% { transform: translateY(-100px); }
          50% { transform: translateY(100px); }
          100% { transform: translateY(-100px); }
        }
      `;
      document.head.appendChild(style);
      
      overlay.appendChild(scanLine);
      
      // Create instruction text
      const instruction = document.createElement('div');
      instruction.textContent = 'Position barcode inside the box';
      instruction.style.color = 'white';
      instruction.style.marginTop = '20px';
      instruction.style.fontSize = '16px';
      instruction.style.fontWeight = 'bold';
      
      // Create close button
      const closeButton = document.createElement('button');
      closeButton.textContent = 'Cancel';
      closeButton.style.marginTop = '20px';
      closeButton.style.padding = '10px 20px';
      closeButton.style.backgroundColor = '#f44336';
      closeButton.style.color = 'white';
      closeButton.style.border = 'none';
      closeButton.style.borderRadius = '4px';
      closeButton.style.cursor = 'pointer';
      
      // Create manual input button
      const manualInputButton = document.createElement('button');
      manualInputButton.textContent = 'Enter Manually';
      manualInputButton.style.marginTop = '10px';
      manualInputButton.style.padding = '8px 16px';
      manualInputButton.style.backgroundColor = '#2196F3';
      manualInputButton.style.color = 'white';
      manualInputButton.style.border = 'none';
      manualInputButton.style.borderRadius = '4px';
      manualInputButton.style.cursor = 'pointer';
      
      // Add elements to modal
      modalContainer.appendChild(previewElem);
      modalContainer.appendChild(overlay);
      modalContainer.appendChild(instruction);
      modalContainer.appendChild(manualInputButton);
      modalContainer.appendChild(closeButton);
      document.body.appendChild(modalContainer);
      
      // Initialize barcode reader
      const codeReader = new BrowserMultiFormatReader();
      
      // Handle close button click
      closeButton.addEventListener('click', () => {
        cleanupScanner();
        resolve({
          success: false,
          data: "",
          error: 'Scanning cancelled'
        });
      });
      
      // Handle manual input button click
      manualInputButton.addEventListener('click', () => {
        const barcodeInput = window.prompt('Enter barcode manually:');
        if (barcodeInput && barcodeInput.trim() !== '') {
          cleanupScanner();
          resolve({
            success: true,
            data: barcodeInput.trim()
          });
        }
      });
      
      // Cleanup function
      const cleanupScanner = () => {
        try {
          codeReader.reset();
          document.body.removeChild(modalContainer);
          document.head.removeChild(style);
        } catch (error) {
          console.error('Error during scanner cleanup:', error);
        }
      };
      
      // Set a timeout based on options or default to 60 seconds
      const timeoutDuration = options?.timeout || 60000;
      const timeoutId = setTimeout(() => {
        cleanupScanner();
        resolve({
          success: false,
          data: "",
          error: 'Scanning timed out. Please try again or enter manually.'
        });
      }, timeoutDuration);
      
      // Start the camera
      const startCamera = async () => {
        try {
          // Get available cameras
          const videoInputDevices = await codeReader.listVideoInputDevices();
          if (videoInputDevices.length === 0) {
            throw new Error('No camera found');
          }
          
          // Select appropriate camera based on preference
          let selectedDeviceId = null;
          
          if (useBackCamera) {
            // Try to find back camera first
            const backCamera = videoInputDevices.find(device => 
              device.label.toLowerCase().includes('back') || 
              device.label.toLowerCase().includes('rear') || 
              device.label.toLowerCase().includes('environment')
            );
            selectedDeviceId = backCamera?.deviceId || null;
          } else {
            // Try to find front camera first
            const frontCamera = videoInputDevices.find(device => 
              device.label.toLowerCase().includes('front') || 
              device.label.toLowerCase().includes('user') ||
              device.label.toLowerCase().includes('face')
            );
            selectedDeviceId = frontCamera?.deviceId || null;
          }
          
          // Fall back to first camera if preferred one not found
          if (!selectedDeviceId && videoInputDevices.length > 0) {
            selectedDeviceId = videoInputDevices[0].deviceId;
          }
          
          // Start decoding from video device
          codeReader.decodeFromVideoDevice(
            selectedDeviceId,
            previewElem,
            (result, error) => {
              if (result) {
                // Play success beep
                try {
                  const beep = new Audio("data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU" + Array(100).join("A"));
                  beep.volume = 0.2;
                  beep.play().catch(e => console.log("Couldn't play success sound"));
                } catch (e) {
                  console.log("Beep error:", e);
                }
                
                // Flash green success indicator
                overlay.style.border = '3px solid #4CAF50';
                instruction.textContent = 'Barcode detected!';
                instruction.style.color = '#4CAF50';
                
                // Clear timeout
                clearTimeout(timeoutId);
                
                // Delay a bit to show success state, then clean up
                setTimeout(() => {
                  cleanupScanner();
                  resolve({
                    success: true,
                    data: result.getText()
                  });
                }, 500);
              }
              
              if (error && !(error instanceof Exception)) {
                console.error("Scanning error:", error);
              }
            }
          );
          
        } catch (error) {
          clearTimeout(timeoutId);
          cleanupScanner();
          resolve({
            success: false,
            data: "",
            error: error instanceof Error ? error.message : 'Failed to start camera'
          });
        }
      };
      
      // Start camera access
      startCamera();
      
    } catch (error) {
      resolve({
        success: false,
        data: "",
        error: error instanceof Error ? error.message : 'Failed to initialize scanner'
      });
    }
  });
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