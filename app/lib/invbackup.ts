import { BrowserMultiFormatReader, Result, BarcodeFormat, Exception } from '@zxing/library';

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

export async function scanBarcode(useBackCamera: boolean = true): Promise<BarcodeResult> {
  return new Promise((resolve) => {
    try {
      // Create modal container
      const modalContainer = document.createElement('div');
      modalContainer.style.position = 'fixed';
      modalContainer.style.top = '0';
      modalContainer.style.left = '0';
      modalContainer.style.width = '100%';
      modalContainer.style.height = '100%';
      modalContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
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
      previewElem.style.backgroundColor = '#000';
      
      // Create close button
      const closeButton = document.createElement('button');
      closeButton.textContent = 'Cancel';
      closeButton.style.marginTop = '20px';
      closeButton.style.padding = '8px 16px';
      closeButton.style.backgroundColor = '#f44336';
      closeButton.style.color = 'white';
      closeButton.style.border = 'none';
      closeButton.style.borderRadius = '4px';
      closeButton.style.cursor = 'pointer';
      
      // Add elements to modal
      modalContainer.appendChild(previewElem);
      modalContainer.appendChild(closeButton);
      document.body.appendChild(modalContainer);
      
      // Initialize barcode reader
      const codeReader = new BrowserMultiFormatReader();
      
      // Handle close button click
      closeButton.addEventListener('click', () => {
        codeReader.reset();
        document.body.removeChild(modalContainer);
        resolve({
          success: false,
          error: 'Scanning cancelled'
        });
      });
      
      // Start the camera
      const startCamera = async () => {
        try {
          // Get available cameras
          const videoInputDevices = await codeReader.listVideoInputDevices();
          if (videoInputDevices.length === 0) {
            throw new Error('No camera found');
          }
          
          // Select appropriate camera
          let selectedDeviceId = undefined;
          
          if (useBackCamera) {
            // Try to find back camera
            const backCamera = videoInputDevices.find(device => 
              device.label.toLowerCase().includes('back') || 
              device.label.toLowerCase().includes('environment')
            );
            selectedDeviceId = backCamera?.deviceId;
          } else {
            // Try to find front camera
            const frontCamera = videoInputDevices.find(device => 
              device.label.toLowerCase().includes('front') || 
              device.label.toLowerCase().includes('user')
            );
            selectedDeviceId = frontCamera?.deviceId;
          }
          
          // Fall back to first camera if preferred one not found
          if (!selectedDeviceId && videoInputDevices.length > 0) {
            selectedDeviceId = videoInputDevices[0].deviceId;
          }
          
          // Start scanning
          codeReader.decodeFromVideoDevice(
            selectedDeviceId,
            previewElem,
            (result, error) => {
              if (result) {
                // Successfully detected barcode
                codeReader.reset();
                document.body.removeChild(modalContainer);
                resolve({
                  success: true,
                  data: result.getText()
                });
              }
              if (error && !(error instanceof Exception)) {
                console.error(error);
              }
            }
          );
          
        } catch (error) {
          document.body.removeChild(modalContainer);
          resolve({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to start camera'
          });
        }
      };
      
      // Start camera access
      startCamera();
      
    } catch (error) {
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