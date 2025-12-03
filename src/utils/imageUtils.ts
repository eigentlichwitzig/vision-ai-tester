/**
 * Image utility functions for preview rendering
 * Task #7: Convert raw base64 back to Data URI for browser rendering
 */

import { addDataUriPrefix, stripDataUriPrefix } from './base64'

/**
 * Image dimensions interface
 */
export interface ImageDimensions {
  width: number
  height: number
}

/**
 * Default MIME types for images
 */
const DEFAULT_IMAGE_MIME_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  bmp: 'image/bmp'
}

/**
 * Convert raw base64 to Data URI for browser rendering
 * OPPOSITE of Task #6 - Task #6 strips prefix, Task #7 adds it back
 * 
 * @example
 * // Raw base64 from storage
 * const raw = "iVBORw0KG..."
 * // Convert for browser display
 * const dataUri = base64ToDataUri(raw, "image/jpeg")
 * // Result: "data:image/jpeg;base64,iVBORw0KG..."
 */
export function base64ToDataUri(base64String: string, mimeType: string): string {
  return addDataUriPrefix(stripDataUriPrefix(base64String), mimeType)
}

/**
 * Get image dimensions by loading the image
 * Returns a promise that resolves with the image dimensions
 * 
 * @param dataUri - Data URI string for the image
 * @returns Promise with ImageDimensions or null on error
 */
export function getImageDimensions(dataUri: string): Promise<ImageDimensions | null> {
  return new Promise((resolve) => {
    const img = new Image()
    
    img.onload = () => {
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight
      })
    }
    
    img.onerror = () => {
      resolve(null)
    }
    
    img.src = dataUri
  })
}

/**
 * Format image dimensions for display
 * 
 * @example
 * formatDimensions({ width: 1920, height: 1080 }) // "1920 × 1080 px"
 */
export function formatDimensions(dimensions: ImageDimensions): string {
  return `${dimensions.width} × ${dimensions.height} px`
}

/**
 * Calculate aspect ratio from dimensions
 * 
 * @example
 * calculateAspectRatio({ width: 1920, height: 1080 }) // "16:9"
 * calculateAspectRatio({ width: 800, height: 600 }) // "4:3"
 */
export function calculateAspectRatio(dimensions: ImageDimensions): string {
  const { width, height } = dimensions
  
  if (width === 0 || height === 0) {
    return '0:0'
  }
  
  // Find GCD to simplify ratio
  const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b)
  const divisor = gcd(width, height)
  
  const ratioWidth = width / divisor
  const ratioHeight = height / divisor
  
  // Handle common aspect ratios with nice representations
  const ratio = width / height
  
  // Check for common aspect ratios (with tolerance for rounding)
  const commonRatios: [number, string][] = [
    [16 / 9, '16:9'],
    [4 / 3, '4:3'],
    [3 / 2, '3:2'],
    [1 / 1, '1:1'],
    [21 / 9, '21:9'],
    [9 / 16, '9:16'],
    [3 / 4, '3:4'],
    [2 / 3, '2:3']
  ]
  
  for (const [commonRatio, label] of commonRatios) {
    if (Math.abs(ratio - commonRatio) < 0.01) {
      return label
    }
  }
  
  // Fall back to simplified ratio if not a common one
  // For very large numbers, show as decimal
  if (ratioWidth > 100 || ratioHeight > 100) {
    return `${ratio.toFixed(2)}:1`
  }
  
  return `${ratioWidth}:${ratioHeight}`
}

/**
 * Get MIME type from file extension
 */
export function getMimeTypeFromExtension(fileName: string): string {
  const extension = fileName.split('.').pop()?.toLowerCase() || ''
  return DEFAULT_IMAGE_MIME_TYPES[extension] || 'image/jpeg'
}

/**
 * Check if a MIME type is a supported image type
 */
export function isSupportedImageType(mimeType: string): boolean {
  return mimeType.startsWith('image/')
}

/**
 * Calculate scaled dimensions while maintaining aspect ratio
 * 
 * @param dimensions - Original dimensions
 * @param maxWidth - Maximum width constraint
 * @param maxHeight - Maximum height constraint
 * @returns Scaled dimensions that fit within constraints
 */
export function calculateScaledDimensions(
  dimensions: ImageDimensions,
  maxWidth: number,
  maxHeight: number
): ImageDimensions {
  const { width, height } = dimensions
  
  if (width <= maxWidth && height <= maxHeight) {
    return { width, height }
  }
  
  const widthRatio = maxWidth / width
  const heightRatio = maxHeight / height
  const scale = Math.min(widthRatio, heightRatio)
  
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale)
  }
}
