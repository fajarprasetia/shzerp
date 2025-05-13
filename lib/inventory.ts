import { BrowserMultiFormatReader, Result, BarcodeFormat, DecodeHintType } from '@zxing/library';

interface BarcodeResult {
  success: boolean;
  data?: string;
  error?: string;
}

interface CameraDevice {
  deviceId: string;
  label: string;
  facingMode?: string;
}

interface ScanOptions {
  tryHarder?: boolean;
  timeout?: number; // Timeout in milliseconds
  scanInterval?: number; // Interval between scans in milliseconds
  enableProgressBar?: boolean; // Whether to show a progress bar
  showCameraSelection?: boolean; // Whether to show camera selection button
}

export async function scanBarcode(useBackCamera: boolean = true, options?: ScanOptions): Promise<BarcodeResult> {
  return new Promise((resolve) => {
    try {
      // Set defaults for options
      const scanOptions: ScanOptions = {
        tryHarder: options?.tryHarder ?? true,
        timeout: options?.timeout ?? 60000, // 60 seconds default
        scanInterval: options?.scanInterval ?? 100, // 100ms default scan interval (for more frequent scans)
        enableProgressBar: options?.enableProgressBar ?? true,
        showCameraSelection: options?.showCameraSelection ?? true
      };
      
      // Create modal container
      const modalContainer = document.createElement('div');
      modalContainer.style.position = 'fixed';
      modalContainer.style.top = '0';
      modalContainer.style.left = '0';
      modalContainer.style.width = '100%';
      modalContainer.style.height = '100%';
      modalContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.85)';
      modalContainer.style.zIndex = '9999';
      modalContainer.style.display = 'flex';
      modalContainer.style.flexDirection = 'column';
      modalContainer.style.justifyContent = 'center';
      modalContainer.style.alignItems = 'center';
      
      // Create video element for preview
      const previewElem = document.createElement('video');
      previewElem.style.maxWidth = '95%';
      previewElem.style.maxHeight = '70%';
      previewElem.style.borderRadius = '8px';
      previewElem.style.backgroundColor = '#000';
      previewElem.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.25)';
      
      // Create scan overlay with targeting rectangle
      const scanOverlay = document.createElement('div');
      scanOverlay.style.position = 'absolute';
      scanOverlay.style.pointerEvents = 'none';
      scanOverlay.style.width = '95%';
      scanOverlay.style.maxWidth = previewElem.style.maxWidth;
      scanOverlay.style.height = '70%';
      scanOverlay.style.maxHeight = previewElem.style.maxHeight;
      scanOverlay.style.display = 'flex';
      scanOverlay.style.justifyContent = 'center';
      scanOverlay.style.alignItems = 'center';
      
      // Create target box
      const targetBox = document.createElement('div');
      targetBox.style.border = '2px dashed rgba(0, 255, 0, 0.7)';
      targetBox.style.width = '80%';
      targetBox.style.height = '40%';
      targetBox.style.borderRadius = '8px';
      targetBox.style.position = 'relative';
      
      // Create scan line animation
      const scanLine = document.createElement('div');
      scanLine.style.position = 'absolute';
      scanLine.style.left = '0';
      scanLine.style.top = '50%';
      scanLine.style.width = '100%';
      scanLine.style.height = '2px';
      scanLine.style.backgroundColor = 'rgba(255, 0, 0, 0.7)';
      scanLine.style.animation = 'scanLine 2s ease-in-out infinite';
      
      // Add the scan line animation style
      const style = document.createElement('style');
      style.textContent = `
        @keyframes scanLine {
          0% { top: 0; }
          50% { top: 100%; }
          100% { top: 0; }
        }
      `;
      document.head.appendChild(style);
      
      targetBox.appendChild(scanLine);
      scanOverlay.appendChild(targetBox);
      
      // Create status message element
      const statusMessage = document.createElement('div');
      statusMessage.style.marginTop = '16px';
      statusMessage.style.padding = '8px 16px';
      statusMessage.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
      statusMessage.style.color = 'white';
      statusMessage.style.borderRadius = '4px';
      statusMessage.style.fontSize = '14px';
      statusMessage.style.textAlign = 'center';
      statusMessage.style.maxWidth = '80%';
      statusMessage.style.fontWeight = '500';
      statusMessage.textContent = 'Starting camera...';
      
      // Create buttons container
      const buttonsContainer = document.createElement('div');
      buttonsContainer.style.display = 'flex';
      buttonsContainer.style.gap = '12px';
      buttonsContainer.style.marginTop = '16px';
      
      // Create close button
      const closeButton = document.createElement('button');
      closeButton.textContent = 'Cancel';
      closeButton.style.padding = '8px 16px';
      closeButton.style.backgroundColor = '#f44336';
      closeButton.style.color = 'white';
      closeButton.style.border = 'none';
      closeButton.style.borderRadius = '4px';
      closeButton.style.cursor = 'pointer';
      closeButton.style.fontWeight = 'bold';
      
      // Create switch camera button
      const switchCameraButton = document.createElement('button');
      switchCameraButton.textContent = useBackCamera ? 'Use Front Camera' : 'Use Back Camera';
      switchCameraButton.style.padding = '8px 16px';
      switchCameraButton.style.backgroundColor = '#2196F3';
      switchCameraButton.style.color = 'white';
      switchCameraButton.style.border = 'none';
      switchCameraButton.style.borderRadius = '4px';
      switchCameraButton.style.cursor = 'pointer';
      switchCameraButton.style.fontWeight = 'bold';
      
      // Add buttons to container
      buttonsContainer.appendChild(closeButton);
      buttonsContainer.appendChild(switchCameraButton);
      
      // Add elements to modal
      modalContainer.appendChild(previewElem);
      modalContainer.appendChild(scanOverlay);
      modalContainer.appendChild(statusMessage);
      modalContainer.appendChild(buttonsContainer);
      document.body.appendChild(modalContainer);
      
      // Setup scanner with enhanced hints
      const hints = new Map();
      // Set decoding to try these formats (prioritize 1D and QR formats)
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.CODE_39,
        BarcodeFormat.CODE_128,
        BarcodeFormat.QR_CODE,
        BarcodeFormat.DATA_MATRIX,
        BarcodeFormat.EAN_13,
        BarcodeFormat.EAN_8,
        BarcodeFormat.UPC_A,
        BarcodeFormat.UPC_E,
      ]);
      
      // Enable try harder mode for better detection
      hints.set(DecodeHintType.TRY_HARDER, true);
      
      // Increase character set to support more types
      hints.set(DecodeHintType.CHARACTER_SET, 'UTF-8');
      
      // Initialize barcode reader with enhanced hints
      const codeReader = new BrowserMultiFormatReader(hints);
      let currentVideoDeviceId: string | undefined = undefined;
      
      // Set timeout to abort scanning after specified time
      let timeoutId: number | undefined = undefined;
      if (scanOptions.timeout) {
        timeoutId = window.setTimeout(() => {
          codeReader.reset();
          document.body.removeChild(modalContainer);
          document.head.removeChild(style);
          resolve({
            success: false,
            error: 'Scanning timed out. Please try again.'
          });
        }, scanOptions.timeout);
      }
      
      // Handle close button click
      closeButton.addEventListener('click', () => {
        if (timeoutId) clearTimeout(timeoutId);
        codeReader.reset();
        document.body.removeChild(modalContainer);
        document.head.removeChild(style);
        resolve({
          success: false,
          error: 'Scanning cancelled'
        });
      });
      
      // Handle switch camera button click
      switchCameraButton.addEventListener('click', () => {
        // Reset current reader
        codeReader.reset();
        // Restart with opposite camera setting
        startCamera(!useBackCamera);
        // Update button text
        switchCameraButton.textContent = !useBackCamera ? 'Use Front Camera' : 'Use Back Camera';
      });
      
      // Start the camera with better device detection
      const startCamera = async (useBack: boolean = useBackCamera) => {
        try {
          statusMessage.textContent = 'Starting camera...';
          
          // Get available cameras
          const videoInputDevices = await codeReader.listVideoInputDevices();
          console.log('Available video devices:', videoInputDevices);
          
          if (videoInputDevices.length === 0) {
            statusMessage.textContent = 'No camera found. Please enable camera access.';
            throw new Error('No camera found');
          }
          
          // Log camera information for debugging
          videoInputDevices.forEach((device, index) => {
            console.log(`Camera ${index}: ${device.label}, ID: ${device.deviceId}`);
          });
          
          // Enhanced camera selection logic
          let selectedDeviceId: string | undefined = undefined;
          
          if (useBack) {
            // Try to find back camera by more comprehensive label matching
            const backCamera = videoInputDevices.find(device => {
              const label = device.label.toLowerCase();
              return (
                label.includes('back') || 
                label.includes('rear') ||
                label.includes('environment') ||
                // Also try to detect by camera position in array
                // On mobile, back camera is often the first or second in the list
                (videoInputDevices.length > 1 && !label.includes('front') && !label.includes('face'))
              );
            });
            
            if (backCamera) {
              selectedDeviceId = backCamera.deviceId;
              console.log('Selected back camera:', backCamera.label);
              statusMessage.textContent = `Using back camera: ${backCamera.label}`;
            }
          } else {
            // Try to find front camera by more comprehensive label matching
            const frontCamera = videoInputDevices.find(device => {
              const label = device.label.toLowerCase();
              return (
                label.includes('front') || 
                label.includes('user') ||
                label.includes('face') ||
                label.includes('selfie')
              );
            });
            
            if (frontCamera) {
              selectedDeviceId = frontCamera.deviceId;
              console.log('Selected front camera:', frontCamera.label);
              statusMessage.textContent = `Using front camera: ${frontCamera.label}`;
            }
          }
          
          // If no camera was selected by label, use safer fallbacks
          if (!selectedDeviceId && videoInputDevices.length > 0) {
            // For single camera devices, just use the available camera
            if (videoInputDevices.length === 1) {
              selectedDeviceId = videoInputDevices[0].deviceId;
              console.log('Fallback to only available camera:', videoInputDevices[0].label);
              statusMessage.textContent = `Using camera: ${videoInputDevices[0].label}`;
            } else {
              // Use first device for front camera, last device for back camera (common pattern on mobile)
              selectedDeviceId = useBack 
                ? videoInputDevices[0].deviceId  // Back camera is usually the first
                : videoInputDevices[videoInputDevices.length - 1].deviceId; // Front camera usually last
                
              const selectedDevice = useBack 
                ? videoInputDevices[0]
                : videoInputDevices[videoInputDevices.length - 1];
                
              console.log(`Fallback camera selection (${useBack ? 'back' : 'front'}):`, selectedDevice.label);
              statusMessage.textContent = `Using ${useBack ? 'back' : 'front'} camera: ${selectedDevice.label}`;
            }
          }
          
          currentVideoDeviceId = selectedDeviceId;
          
          // Update status message with scanning instructions
          setTimeout(() => {
            statusMessage.textContent = 'Camera active. Point at a barcode...';
          }, 1000);
          
          // Add a progress bar to show scanning activity
          const progressContainer = document.createElement('div');
          progressContainer.style.width = '100%';
          progressContainer.style.maxWidth = '300px';
          progressContainer.style.height = '4px';
          progressContainer.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
          progressContainer.style.borderRadius = '2px';
          progressContainer.style.marginTop = '8px';
          progressContainer.style.overflow = 'hidden';
          
          const progressBar = document.createElement('div');
          progressBar.style.height = '100%';
          progressBar.style.backgroundColor = '#4CAF50';
          progressBar.style.width = '0%';
          progressBar.style.transition = 'width 0.2s ease-in-out';
          
          progressContainer.appendChild(progressBar);
          
          if (scanOptions.enableProgressBar) {
            modalContainer.insertBefore(progressContainer, statusMessage);
          }
          
          // Animation for progress bar with better timing precision
          let progress = 0;
          const updateProgress = () => {
            if (scanOptions.timeout && scanOptions.scanInterval) {
              progress += scanOptions.scanInterval / scanOptions.timeout * 100;
              progressBar.style.width = `${Math.min(progress, 100)}%`;
            }
          };
          
          // Start scanning with enhanced error handling
          try {
            codeReader.decodeFromVideoDevice(
              selectedDeviceId || null,
              previewElem,
              (result, error) => {
                updateProgress();
                
                if (result) {
                  // Successfully detected barcode
                  const barcodeValue = result.getText();
                  console.log('Barcode detected:', barcodeValue);
                  statusMessage.textContent = `Detected: ${barcodeValue}`;
                  
                  // Highlight the detected barcode
                  progressBar.style.width = '100%';
                  progressBar.style.backgroundColor = '#4CAF50';
                  targetBox.style.border = '2px solid #4CAF50';
                  targetBox.style.backgroundColor = 'rgba(76, 175, 80, 0.2)';
                  
                  // Clear timeout if it exists
                  if (timeoutId) clearTimeout(timeoutId);
                  
                  // Small delay to show the detected barcode before closing
                  setTimeout(() => {
                    codeReader.reset();
                    document.body.removeChild(modalContainer);
                    document.head.removeChild(style);
                    resolve({
                      success: true,
                      data: barcodeValue
                    });
                  }, 500);
                }
                
                if (error && !(error.name === 'NotFoundException')) {
                  console.error('Barcode detection error:', error);
                  // Only show actual errors, not "not found" errors which are normal while searching
                  if (error.name !== 'NotFoundException') {
                    statusMessage.textContent = `Error: ${error.message || 'Failed to detect barcode'}`;
                  }
                }
              }
            );
          } catch (cameraError) {
            console.error('Error initializing camera stream:', cameraError);
            statusMessage.textContent = `Camera error: ${cameraError instanceof Error ? cameraError.message : 'Could not access camera stream'}`;
            
            // Add a retry button
            const retryButton = document.createElement('button');
            retryButton.textContent = 'Retry Camera';
            retryButton.style.padding = '8px 16px';
            retryButton.style.backgroundColor = '#ff9800';
            retryButton.style.color = 'white';
            retryButton.style.border = 'none';
            retryButton.style.borderRadius = '4px';
            retryButton.style.cursor = 'pointer';
            retryButton.style.margin = '8px';
            
            retryButton.addEventListener('click', () => {
              // Try again with different device
              startCamera(!useBack);
            });
            
            buttonsContainer.insertBefore(retryButton, switchCameraButton);
          }
          
        } catch (error) {
          console.error('Camera start error:', error);
          statusMessage.textContent = error instanceof Error ? error.message : 'Failed to start camera';
          statusMessage.style.backgroundColor = 'rgba(244, 67, 54, 0.8)';
          
          // Clear timeout if it exists
          if (timeoutId) clearTimeout(timeoutId);
          
          setTimeout(() => {
            document.body.removeChild(modalContainer);
            document.head.removeChild(style);
            resolve({
              success: false,
              error: error instanceof Error ? error.message : 'Failed to start camera'
            });
          }, 2000);
        }
      };
      
      // Start camera access
      startCamera();
      
    } catch (error) {
      console.error('Barcode scanner initialization error:', error);
      resolve({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to scan barcode'
      });
    }
  });
}

export async function validateStockBarcode(barcode: string): Promise<any> {
  try {
    const response = await fetch(`/api/inventory/stock/validate?barcode=${barcode}`);
    if (!response.ok) {
      throw new Error('Invalid barcode');
    }
    return response.json();
  } catch (error) {
    throw new Error('Failed to validate barcode');
  }
}

export function generateBarcode(text: string): string {
  // This is a placeholder - generating barcodes properly requires a library
  // In a real implementation, use a proper barcode generation library
  return `data:image/png;base64,${btoa(text)}`;
} 