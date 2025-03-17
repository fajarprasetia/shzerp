import { BrowserMultiFormatReader, Result, BarcodeFormat } from '@zxing/library';

interface BarcodeResult {
  success: boolean;
  data?: string;
  error?: string;
}

export async function scanBarcode(): Promise<BarcodeResult> {
  try {
    const codeReader = new BrowserMultiFormatReader();
    
    // Configure hints for better performance
    const hints = new Map();
    hints.set(BarcodeFormat.CODE_128, true);
    hints.set(BarcodeFormat.EAN_13, true);
    hints.set(BarcodeFormat.QR_CODE, true);
    
    // Request camera access
    const videoInputDevices = await codeReader.listVideoInputDevices();
    if (videoInputDevices.length === 0) {
      throw new Error('No camera found');
    }

    // Use the first available camera
    const selectedDeviceId = videoInputDevices[0].deviceId;

    // Create video element for preview
    const previewElem = document.createElement('video');
    previewElem.style.position = 'fixed';
    previewElem.style.top = '50%';
    previewElem.style.left = '50%';
    previewElem.style.transform = 'translate(-50%, -50%)';
    previewElem.style.zIndex = '9999';
    document.body.appendChild(previewElem);

    try {
      // Start scanning
      const result: Result = await codeReader.decodeFromVideoDevice(
        selectedDeviceId,
        previewElem,
        (result, error) => {
          if (result) {
            // Stop scanning when a barcode is found
            codeReader.reset();
            document.body.removeChild(previewElem);
          }
        }
      );

      return {
        success: true,
        data: result.getText()
      };
    } catch (error) {
      document.body.removeChild(previewElem);
      throw error;
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to scan barcode'
    };
  }
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
  // Generate CODE128 barcode
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get canvas context');

  // Set canvas size
  canvas.width = 200;
  canvas.height = 100;

  // Clear canvas
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw barcode
  const x = 10;
  const y = 10;
  const width = 180;
  const height = 80;

  // Generate barcode using @zxing/library
  const writer = new window.ZXing.BrowserQRCodeSvgWriter();
  const svgString = writer.write(text, width, height);
  
  // Convert SVG to image and draw on canvas
  const img = new Image();
  img.src = 'data:image/svg+xml;base64,' + btoa(svgString);
  img.onload = () => {
    ctx.drawImage(img, x, y);
  };

  return canvas.toDataURL('image/png');
} 