import { Stock, Divided } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import jsQR from "jsqr";
import { 
  BrowserMultiFormatReader, 
  Result, 
  BarcodeFormat, 
  Exception, 
  DecodeHintType
} from '@zxing/library';
import Quagga from '@ericblade/quagga2';

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

export interface Code128ScanOptions {
  timeout?: number;
  frequency?: number;
  numOfWorkers?: number;
  locator?: {
    halfSample?: boolean;
    patchSize?: string;
  };
  successThreshold?: number;
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
      hints.set(DecodeHintType.TRY_HARDER, true); // Always try harder for Code 128
      hints.set(DecodeHintType.ASSUME_GS1, true);
      hints.set(DecodeHintType.CHARACTER_SET, 'UTF-8');
      hints.set(DecodeHintType.PURE_BARCODE, true); // Try without finder patterns
      
      // Create specific Code 128 reader
      const createCode128Reader = () => {
        const specificHints = new Map();
        specificHints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.CODE_128]);
        specificHints.set(DecodeHintType.TRY_HARDER, true);
        specificHints.set(DecodeHintType.PURE_BARCODE, true);
        
        return new BrowserMultiFormatReader(specificHints);
      };
      
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
          
          // Safety check to ensure elements still exist in the DOM before removing
          if (modalContainer && modalContainer.parentNode) {
          document.body.removeChild(modalContainer);
          }
          
          if (style && style.parentNode) {
          document.head.removeChild(style);
          }
        } catch (error) {
          console.error('Error during scanner cleanup:', error);
          // Continue execution despite errors
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
      
      // Process function for Code 128 specific detection
      const processForCode128 = () => {
        if (!ctx || !canvas || !previewElem || !previewElem.videoWidth) return;
        
        try {
          // Re-draw the current video frame with higher contrast for barcode detection
          canvas.width = previewElem.videoWidth;
          canvas.height = previewElem.videoHeight;
          
          // Apply higher contrast to help with barcode detection
          ctx.drawImage(previewElem, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          
          // Enhance contrast
          const data = imageData.data;
          for (let i = 0; i < data.length; i += 4) {
            // Convert to grayscale with higher contrast
            const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
            const newVal = avg > 120 ? 255 : 0; // Increase threshold for sharper contrast
            data[i] = data[i + 1] = data[i + 2] = newVal;
          }
          
          ctx.putImageData(imageData, 0, 0);
          
          // Try to read Code 128 with specific reader
          // This would require browser-side processing or passing to server
          // For now, we rely on the jsQR and ZXing fallback mechanisms
        } catch (error) {
          console.error("Code 128 processing error:", error);
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
              if (!jsQRFallbackInterval && error) {
                // Convert error to string safely
                const errorText = typeof error === 'object' ? 
                  (error as Record<string, unknown>).message?.toString() || String(error) : 
                  String(error);
                
                if (errorText.includes("No MultiFormat Readers were able")) {
                  statusText.textContent = 'Using alternative scanner methods...';
                  
                  // Start jsQR fallback for QR codes
                  jsQRFallbackInterval = window.setInterval(() => {
                    processVideoFrameWithJsQR();
                    processForCode128(); // Also try Code 128 specific processing
                  }, 200);
                  
                  // Try with a Code 128 specific reader after a short delay
                  setTimeout(() => {
                    if (!isProcessing) {
                      try {
                        const code128Reader = createCode128Reader();
                        statusText.textContent = 'Trying Code 128 specific reader...';
                        
                        // Switch to Code 128 specific reader
                        codeReader.reset();
                        code128Reader.decodeFromVideoDevice(
                          deviceId,
                          previewElem,
                          (result, specificError) => {
                            if (result) {
                              handleSuccessfulScan(result.getText());
                            }
                          }
                        );
                      } catch (e) {
                        console.error("Failed to create Code 128 reader:", e);
                      }
                    }
                  }, 3000);
                }
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

export async function scanBarcode128(options?: Code128ScanOptions): Promise<ScanBarcodeResult> {
  return new Promise((resolve) => {
    let isResolved = false; // Flag to track if promise is already resolved
    let modalContainer: HTMLDivElement | null = null;
    
    try {
      // Create modal container
      modalContainer = document.createElement('div');
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
      
      // Create scanner container
      const scannerContainer = document.createElement('div');
      scannerContainer.id = 'quagga-scanner';
      scannerContainer.style.width = '100%';
      scannerContainer.style.maxWidth = '640px';
      scannerContainer.style.height = '480px';
      scannerContainer.style.position = 'relative';
      scannerContainer.style.overflow = 'hidden';
      scannerContainer.style.borderRadius = '8px';
      
      // Create scanning guide overlay - Make it taller for better phone camera recognition
      const overlay = document.createElement('div');
      overlay.style.position = 'absolute';
      overlay.style.top = '50%';
      overlay.style.left = '50%';
      overlay.style.transform = 'translate(-50%, -50%)';
      overlay.style.width = '80%';
      overlay.style.height = '150px'; // Increased from 100px to 150px
      overlay.style.border = '2px dashed #fff';
      overlay.style.borderRadius = '4px';
      overlay.style.boxSizing = 'border-box';
      overlay.style.pointerEvents = 'none';
      overlay.style.zIndex = '10';
      
      // Create instruction text
      const instruction = document.createElement('div');
      instruction.textContent = 'Position Code 128 barcode inside the box';
      instruction.style.color = 'white';
      instruction.style.marginTop = '20px';
      instruction.style.fontSize = '16px';
      instruction.style.fontWeight = 'bold';
      instruction.style.textAlign = 'center';
      
      // Create feedback text
      const feedbackText = document.createElement('div');
      feedbackText.textContent = 'Initializing scanner...';
      feedbackText.style.color = '#ccc';
      feedbackText.style.marginTop = '10px';
      feedbackText.style.fontSize = '14px';
      feedbackText.style.textAlign = 'center';
      
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
      scannerContainer.appendChild(overlay);
      modalContainer.appendChild(scannerContainer);
      modalContainer.appendChild(instruction);
      modalContainer.appendChild(feedbackText);
      modalContainer.appendChild(manualInputButton);
      modalContainer.appendChild(closeButton);
      document.body.appendChild(modalContainer);
      
      // Handle close button click
      closeButton.addEventListener('click', () => {
        clearTimeout(timeoutId);
        safeResolve({
          success: false,
          data: "",
          error: 'Scanning cancelled'
        });
      });
      
      // Handle manual input button click
      manualInputButton.addEventListener('click', () => {
        const barcodeInput = window.prompt('Enter barcode manually:');
        if (barcodeInput && barcodeInput.trim() !== '') {
          clearTimeout(timeoutId);
          safeResolve({
            success: true,
            data: barcodeInput.trim()
          });
        }
      });
      
      // Cleanup function
      const cleanupScanner = () => {
        // Prevent multiple cleanups
        if (!modalContainer) return;
        
        try {
          // First stop Quagga to release camera resources
          Quagga.stop();
          
          // Safety check to ensure the element still exists in the DOM before removing
          if (modalContainer.parentNode) {
            document.body.removeChild(modalContainer);
          }
          
          // Set modalContainer to null to prevent further cleanup attempts
          modalContainer = null;
        } catch (error) {
          console.error('Error during scanner cleanup:', error);
          // Continue execution despite errors
        }
      };
      
      // Safe resolver that prevents multiple resolves
      const safeResolve = (result: ScanBarcodeResult) => {
        if (isResolved) return;
        isResolved = true;
        cleanupScanner();
        resolve(result);
      };
      
      // Set a timeout based on options or default to 60 seconds
      const timeoutDuration = options?.timeout || 60000;
      const timeoutId = setTimeout(() => {
        safeResolve({
          success: false,
          data: "",
          error: 'Scanning timed out. Please try again or enter manually.'
        });
      }, timeoutDuration);
      
      // Track detections for confidence threshold
      let detectionCount = 0;
      const detectionResults: Record<string, number> = {};
      const successThreshold = options?.successThreshold || 2; // Decreased from 3 to 2 for better mobile scanning
      
      // Initialize Quagga with improved mobile settings
      Quagga.init({
        inputStream: {
          name: "Live",
          type: "LiveStream",
          target: scannerContainer,
          constraints: {
            width: { min: 450 }, // Decreased from 640 for better mobile performance
            height: { min: 300 }, // Decreased from 480 for better mobile performance
            facingMode: "environment", // Always use back camera for barcode scanning
            // Remove aspectRatio constraint which can cause issues on some mobile devices
          },
          area: { // Expand scanning area for mobile devices
            top: "25%", // Changed from 30%
            right: "5%",  // Changed from 10%
            left: "5%",   // Changed from 10%
            bottom: "25%" // Changed from 30%
          },
        },
        locator: {
          patchSize: "medium", // Consistent medium patch size
          halfSample: true, // Keep half sample enabled for performance
        },
        numOfWorkers: 2, // Reduced from 4 for better mobile performance
        frequency: 15,   // Increased from 10 for more frequent scans
        decoder: {
          readers: ["code_128_reader"],
          multiple: false,
          debug: {
            drawBoundingBox: true,
            showFrequency: true,
            drawScanline: true,
            showPattern: true
          }
        },
        locate: true
      }, function(err) {
        if (err) {
          console.error("Failed to initialize Quagga:", err);
          feedbackText.textContent = "Failed to start scanner. Please check camera permissions.";
          
          // Add fallback for manual entry after error
          setTimeout(() => {
            const manualEntry = confirm("Scanner initialization failed. Would you like to enter the code manually?");
            if (manualEntry) {
              manualInputButton.click();
            } else {
              safeResolve({
                success: false,
                data: "",
                error: 'Scanner initialization failed'
              });
            }
          }, 2000);
          return;
        }
        
        // Start Quagga
        Quagga.start();
        feedbackText.textContent = "Scanner ready. Align barcode within the box...";
        
        // Draw scan line for visual feedback
        const canvas = scannerContainer.querySelector('canvas.drawingBuffer');
        if (canvas) {
          // Type assertion to HTMLElement to access style property
          const canvasElement = canvas as HTMLElement;
          canvasElement.style.position = 'absolute';
          canvasElement.style.top = '0';
          canvasElement.style.left = '0';
        }
      });
      
      // Handle successful detection with lower confidence threshold for mobile
      Quagga.onDetected((result) => {
        const code = result.codeResult.code;
        
        if (!code) return;
        
        // Track the detected code frequency
        detectionResults[code] = (detectionResults[code] || 0) + 1;
        
        // Update feedback with confidence level
        // Type assertion for the codeResult object to access non-standard properties
        const resultWithConfidence = result.codeResult as { confidence?: number };
        const confidence = resultWithConfidence.confidence !== undefined ? 
          Math.round(resultWithConfidence.confidence * 100) / 100 : 
          0;
        
        if (feedbackText) {
          feedbackText.textContent = `Detected: ${code} (Confidence: ${confidence})`;
        }
        
        // Accept lower confidence threshold for mobile devices
        const minConfidence = 0.55; // Reduced from default 0.75
        
        // Check if we have enough consistent detections with sufficient confidence
        if ((detectionResults[code] >= successThreshold) && (confidence > minConfidence)) {
          // Play success beep
          try {
            const beep = new Audio("data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU" + Array(100).join("A"));
            beep.volume = 0.2;
            beep.play().catch(e => console.log("Couldn't play success sound"));
          } catch (e) {
            console.log("Beep error:", e);
          }
          
          // Visual feedback
          if (overlay) {
            overlay.style.border = '3px solid #4CAF50';
          }
          
          if (instruction) {
            instruction.textContent = 'Barcode detected!';
            instruction.style.color = '#4CAF50';
          }
          
          // Clear timeout
          clearTimeout(timeoutId);
          
          // Clean up after short delay to show success feedback
          setTimeout(() => {
            safeResolve({
              success: true,
              data: code
            });
          }, 500);
        }
      });
      
      // Draw the scanning line dynamically
      Quagga.onProcessed((result) => {
        const drawingCtx = Quagga.canvas.ctx.overlay;
        const drawingCanvas = Quagga.canvas.dom.overlay;
        
        if (!drawingCtx || !drawingCanvas) return;
        
        drawingCtx.clearRect(
          0,
          0,
          parseInt(drawingCanvas.getAttribute("width") || "0"),
          parseInt(drawingCanvas.getAttribute("height") || "0")
        );
        
        if (result) {
          // Draw scan area
          if (result.boxes) {
            drawingCtx.strokeStyle = '#F00';
            drawingCtx.lineWidth = 2;
            
            for (let box of result.boxes) {
              drawingCtx.beginPath();
              drawingCtx.moveTo(box[0][0], box[0][1]);
              drawingCtx.lineTo(box[1][0], box[1][1]);
              drawingCtx.lineTo(box[2][0], box[2][1]);
              drawingCtx.lineTo(box[3][0], box[3][1]);
              drawingCtx.lineTo(box[0][0], box[0][1]);
              drawingCtx.stroke();
            }
          }
          
          // Draw guide box in scanning area
          if (result.codeResult && result.codeResult.code) {
            drawingCtx.font = "24px Arial";
            drawingCtx.fillStyle = "#00FF00";
            drawingCtx.fillText(
              result.codeResult.code,
              10,
              30
            );
          }
        }
      });
      
    } catch (error) {
      if (modalContainer && modalContainer.parentNode) {
        try {
          document.body.removeChild(modalContainer);
        } catch (cleanupError) {
          console.error('Error removing modal in catch block:', cleanupError);
        }
      }
      
      resolve({
        success: false,
        data: "",
        error: error instanceof Error ? error.message : 'Failed to initialize scanner'
      });
    }
  });
}

export async function generateJumboRollNo(): Promise<string> {
  try {
    // Call the API endpoint instead of using Prisma directly
    const response = await fetch('/api/inventory/stock/generate-roll-no');
    
    if (!response.ok) {
      throw new Error('Failed to generate roll number');
    }
    
    const data = await response.json();
    return data.rollNo;
  } catch (error) {
    console.error('Error generating roll number:', error);
    throw error;
  }
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