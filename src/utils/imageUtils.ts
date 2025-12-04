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
 * Threshold for generating thumbnails (1MB)
 */
const THUMBNAIL_SIZE_THRESHOLD = 1 * 1024 * 1024

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

/**
 * Check if file size requires thumbnail generation
 * @param size - File size in bytes
 * @returns True if thumbnail should be generated
 */
export function shouldGenerateThumbnail(size: number): boolean {
  return size > THUMBNAIL_SIZE_THRESHOLD
}

/**
 * Generate a thumbnail from a File object
 * Used for large images (>1MB) to improve preview performance
 * 
 * @param file - File object to generate thumbnail from
 * @param maxWidth - Maximum thumbnail width (default: 400)
 * @param maxHeight - Maximum thumbnail height (default: 500)
 * @param quality - JPEG quality 0-1 (default: 0.8)
 * @returns Promise with base64 data URI of thumbnail
 */
export async function generateThumbnail(
  file: File,
  maxWidth = 400,
  maxHeight = 500,
  quality = 0.8
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    
    if (!ctx) {
      reject(new Error('Failed to get canvas context'))
      return
    }
    
    img.onload = () => {
      // Calculate scaled dimensions maintaining aspect ratio
      let width = img.width
      let height = img.height
      
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
      }
      
      canvas.width = width
      canvas.height = height
      ctx.drawImage(img, 0, 0, width, height)
      
      // Revoke object URL to prevent memory leaks
      URL.revokeObjectURL(img.src)
      
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    
    img.onerror = () => {
      URL.revokeObjectURL(img.src)
      reject(new Error('Failed to load image for thumbnail generation'))
    }
    
    img.src = URL.createObjectURL(file)
  })
}

/**
 * Generate thumbnail from base64 content
 * 
 * @param base64Content - Raw base64 content (without data URI prefix)
 * @param mimeType - Original MIME type
 * @param maxWidth - Maximum thumbnail width (default: 400)
 * @param maxHeight - Maximum thumbnail height (default: 500)
 * @param quality - JPEG quality 0-1 (default: 0.8)
 * @returns Promise with base64 data URI of thumbnail
 */
export async function generateThumbnailFromBase64(
  base64Content: string,
  mimeType: string,
  maxWidth = 400,
  maxHeight = 500,
  quality = 0.8
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    
    if (!ctx) {
      reject(new Error('Failed to get canvas context'))
      return
    }
    
    img.onload = () => {
      // Calculate scaled dimensions maintaining aspect ratio
      let width = img.width
      let height = img.height
      
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
      }
      
      canvas.width = width
      canvas.height = height
      ctx.drawImage(img, 0, 0, width, height)
      
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    
    img.onerror = () => {
      reject(new Error('Failed to load image for thumbnail generation'))
    }
    
    img.src = base64ToDataUri(base64Content, mimeType)
  })
}
