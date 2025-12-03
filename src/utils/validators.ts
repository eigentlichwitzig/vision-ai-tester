/**
 * Validation utilities for input validation
 */

/**
 * Maximum file size in bytes (20MB)
 */
export const MAX_FILE_SIZE = 20 * 1024 * 1024

/**
 * Warning threshold for file size (1MB)
 */
export const WARNING_FILE_SIZE = 1 * 1024 * 1024

/**
 * Large file threshold for separate storage (5MB)
 */
export const LARGE_FILE_SIZE = 5 * 1024 * 1024

/**
 * Supported image MIME types
 */
export const SUPPORTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/bmp'
] as const

/**
 * Supported PDF MIME type
 */
export const PDF_MIME_TYPE = 'application/pdf'

/**
 * All supported MIME types
 */
export const SUPPORTED_MIME_TYPES = [
  ...SUPPORTED_IMAGE_TYPES,
  PDF_MIME_TYPE
] as const

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean
  error?: string
  warning?: string
}

/**
 * Validate file size
 */
export function validateFileSize(size: number): ValidationResult {
  if (size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size (${formatFileSize(size)}) exceeds maximum allowed size (${formatFileSize(MAX_FILE_SIZE)})`
    }
  }
  
  if (size > WARNING_FILE_SIZE) {
    return {
      valid: true,
      warning: `Large file (${formatFileSize(size)}) may take longer to process`
    }
  }
  
  return { valid: true }
}

/**
 * Validate file type
 */
export function validateFileType(mimeType: string): ValidationResult {
  if (!SUPPORTED_MIME_TYPES.includes(mimeType as typeof SUPPORTED_MIME_TYPES[number])) {
    return {
      valid: false,
      error: `Unsupported file type: ${mimeType}. Supported types: PDF, JPEG, PNG, GIF, WebP, BMP`
    }
  }
  
  return { valid: true }
}

/**
 * Validate a file for upload
 */
export function validateFile(file: File): ValidationResult {
  const typeResult = validateFileType(file.type)
  if (!typeResult.valid) {
    return typeResult
  }
  
  const sizeResult = validateFileSize(file.size)
  if (!sizeResult.valid) {
    return sizeResult
  }
  
  return {
    valid: true,
    warning: sizeResult.warning
  }
}

/**
 * Check if file is an image
 */
export function isImageFile(file: File): boolean {
  return SUPPORTED_IMAGE_TYPES.includes(file.type as typeof SUPPORTED_IMAGE_TYPES[number])
}

/**
 * Check if file is a PDF
 */
export function isPdfFile(file: File): boolean {
  return file.type === PDF_MIME_TYPE
}

/**
 * Check if file should be stored separately (large file)
 */
export function shouldStoreSeparately(size: number): boolean {
  return size > LARGE_FILE_SIZE
}

/**
 * Validate JSON string
 */
export function validateJson(jsonString: string): ValidationResult {
  try {
    JSON.parse(jsonString)
    return { valid: true }
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Invalid JSON'
    }
  }
}

/**
 * Validate that a value is a valid temperature (0-2)
 */
export function validateTemperature(value: number): ValidationResult {
  if (typeof value !== 'number' || isNaN(value)) {
    return { valid: false, error: 'Temperature must be a number' }
  }
  
  if (value < 0 || value > 2) {
    return { valid: false, error: 'Temperature must be between 0 and 2' }
  }
  
  return { valid: true }
}

/**
 * Validate that a value is a positive integer
 */
export function validatePositiveInteger(value: number, name: string): ValidationResult {
  if (typeof value !== 'number' || isNaN(value)) {
    return { valid: false, error: `${name} must be a number` }
  }
  
  if (!Number.isInteger(value) || value < 1) {
    return { valid: false, error: `${name} must be a positive integer` }
  }
  
  return { valid: true }
}

/**
 * Format file size for display
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
