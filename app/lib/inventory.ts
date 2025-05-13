import { Stock, Divided } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import jsQR from "jsqr";
import { 
  BrowserMultiFormatReader, 
  Result, 
  BarcodeFormat, 
  Exception, 
  DecodeHintType,
  HTML5QrcodeScannerConfig,
  MultiFormatReader,
  BinaryBitmap,
  HybridBinarizer,
  RGBLuminanceSource
} from '@zxing/library';

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
  formats?: BarcodeFormat[];
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
      
      // Create canvas for frame processing (used with jsQR fallback)
      const canvas = document.createElement('canvas');
      canvas.style.display = 'none';
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      
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
      
      // Create status text for debugging
      const statusText = document.createElement('div');
      statusText.style.position = 'absolute';
      statusText.style.bottom = '10px';
      statusText.style.left = '10px';
      statusText.style.color = 'white';
      statusText.style.fontSize = '12px';
      statusText.style.backgroundColor = 'rgba(0,0,0,0.5)';
      statusText.style.padding = '4px 8px';
      statusText.style.borderRadius = '4px';
      statusText.textContent = 'Initializing scanner...';
      
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
      
      // Create tips text
      const tipsText = document.createElement('div');
      tipsText.innerHTML = 'Tips: Hold steady, ensure good lighting<br>Try different distances (15-30cm)';
      tipsText.style.color = '#ccc';
      tipsText.style.marginTop = '10px';
      tipsText.style.fontSize = '14px';
      tipsText.style.textAlign = 'center';
      
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
      
      // Create switch camera button if multiple cameras available
      const switchCameraButton = document.createElement('button');
      switchCameraButton.textContent = 'Switch Camera';
      switchCameraButton.style.marginTop = '10px';
      switchCameraButton.style.marginLeft = '10px';
      switchCameraButton.style.padding = '8px 16px';
      switchCameraButton.style.backgroundColor = '#9E9E9E';
      switchCameraButton.style.color = 'white';
      switchCameraButton.style.border = 'none';
      switchCameraButton.style.borderRadius = '4px';
      switchCameraButton.style.cursor = 'pointer';
      switchCameraButton.style.display = 'none'; // Hide initially
      
      // Add elements to modal
      modalContainer.appendChild(previewElem);
      modalContainer.appendChild(canvas);
      modalContainer.appendChild(overlay);
      modalContainer.appendChild(statusText);
      modalContainer.appendChild(instruction);
      modalContainer.appendChild(tipsText);
      modalContainer.appendChild(manualInputButton);
      modalContainer.appendChild(switchCameraButton);
      modalContainer.appendChild(closeButton);
      document.body.appendChild(modalContainer);
      
      // Define formats to detect - include all common formats
      const formatsToUse = options?.formats || [
        BarcodeFormat.QR_CODE,
        BarcodeFormat.DATA_MATRIX,
        BarcodeFormat.CODE_128,
        BarcodeFormat.CODE_39,
        BarcodeFormat.CODE_93,
        BarcodeFormat.EAN_13,
        BarcodeFormat.EAN_8,
        BarcodeFormat.ITF,
        BarcodeFormat.UPC_A,
        BarcodeFormat.UPC_E,
        BarcodeFormat.CODABAR,
        BarcodeFormat.PDF_417,
        BarcodeFormat.AZTEC
      ];
      
      // Configure hints for better detection
      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, formatsToUse);
      hints.set(DecodeHintType.TRY_HARDER, options?.tryHarder !== false);
      hints.set(DecodeHintType.ASSUME_GS1, true);
      
      // Initialize barcode reader with hints
      const codeReader = new BrowserMultiFormatReader(hints);
      
      let videoInputDevices: MediaDeviceInfo[] = [];
      let currentCameraIndex = 0;
      let isProcessing = false;
      let jsQRFallbackInterval: number | null = null;
      
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
      
      // Handle switch camera button click
      switchCameraButton.addEventListener('click', () => {
        if (videoInputDevices.length <= 1) return;
        
        // Stop current scanner
        codeReader.reset();
        if (jsQRFallbackInterval) {
          clearInterval(jsQRFallbackInterval);
          jsQRFallbackInterval = null;
        }
        
        // Switch to next camera
        currentCameraIndex = (currentCameraIndex + 1) % videoInputDevices.length;
        statusText.textContent = `Switching to camera: ${videoInputDevices[currentCameraIndex].label}`;
        
        // Start with new camera
        startScanner(videoInputDevices[currentCameraIndex].deviceId);
      });
      
      // Cleanup function
      const cleanupScanner = () => {
        try {
          codeReader.reset();
          if (jsQRFallbackInterval) {
            clearInterval(jsQRFallbackInterval);
            jsQRFallbackInterval = null;
          }
          document.body.removeChild(modalContainer);
          document.head.removeChild(style);
        } catch (error) {
          console.error('Error during scanner cleanup:', error);
        }
      };
      
      // Function to handle successful scan
      const handleSuccessfulScan = (barcodeText: string) => {
        if (isProcessing) return;
        isProcessing = true;
        
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
        
        // Stop jsQR fallback if running
        if (jsQRFallbackInterval) {
          clearInterval(jsQRFallbackInterval);
          jsQRFallbackInterval = null;
        }
        
        // Delay a bit to show success state, then clean up
        setTimeout(() => {
          cleanupScanner();
          resolve({
            success: true,
            data: barcodeText
          });
        }, 500);
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
      
      // jsQR fallback function to process video frames
      const processVideoFrameWithJsQR = () => {
        if (!ctx || !canvas || !previewElem || !previewElem.videoWidth) return;
        
        try {
          // Set canvas dimensions to match video
          canvas.width = previewElem.videoWidth;
          canvas.height = previewElem.videoHeight;
          
          // Draw the current video frame to the canvas
          ctx.drawImage(previewElem, 0, 0, canvas.width, canvas.height);
          
          // Get image data for QR code detection
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          
          // Use jsQR to detect QR codes
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
          });
          
          if (code) {
            handleSuccessfulScan(code.data);
          }
        } catch (error) {
          console.error("jsQR processing error:", error);
        }
      };
      
      // Function to start the scanner with a specific device
      const startScanner = (deviceId: string | null) => {
        // Start decoding from video device
        codeReader.decodeFromVideoDevice(
          deviceId,
          previewElem,
          (result, error) => {
            if (result) {
              handleSuccessfulScan(result.getText());
            }
            
            if (error && !(error instanceof Exception)) {
              // Log error but don't resolve yet, as we'll continue trying
              console.error("Barcode detection error:", error);
              statusText.textContent = 'Scanning... (trying multiple formats)';
              
              // If no jsQR fallback is running, start it
              if (!jsQRFallbackInterval && error.toString().includes("No MultiFormat Readers were able")) {
                statusText.textContent = 'Using alternative scanner method...';
                jsQRFallbackInterval = window.setInterval(processVideoFrameWithJsQR, 200);
              }
            }
          }
        );
      };
      
      // Start the camera
      const startCamera = async () => {
        try {
          // Get available cameras
          videoInputDevices = await codeReader.listVideoInputDevices();
          if (videoInputDevices.length === 0) {
            throw new Error('No camera found');
          }
          
          // Show switch camera button if multiple cameras available
          if (videoInputDevices.length > 1) {
            switchCameraButton.style.display = 'inline-block';
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
            if (backCamera) {
              selectedDeviceId = backCamera.deviceId;
              currentCameraIndex = videoInputDevices.indexOf(backCamera);
            }
          } else {
            // Try to find front camera first
            const frontCamera = videoInputDevices.find(device => 
              device.label.toLowerCase().includes('front') || 
              device.label.toLowerCase().includes('user') ||
              device.label.toLowerCase().includes('face')
            );
            if (frontCamera) {
              selectedDeviceId = frontCamera.deviceId;
              currentCameraIndex = videoInputDevices.indexOf(frontCamera);
            }
          }
          
          // Fall back to first camera if preferred one not found
          if (!selectedDeviceId && videoInputDevices.length > 0) {
            selectedDeviceId = videoInputDevices[0].deviceId;
            currentCameraIndex = 0;
          }
          
          // Show selected camera in status
          statusText.textContent = videoInputDevices[currentCameraIndex] 
            ? `Scanning with: ${videoInputDevices[currentCameraIndex].label}`
            : 'Scanning...';
          
          // Start scanning with selected device
          startScanner(selectedDeviceId);
          
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