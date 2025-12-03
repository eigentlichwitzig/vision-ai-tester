/**
 * Validation utilities
 */

const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20MB
const SUPPORTED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif'
]

/**
 * Validate file type
 */
export function isValidFileType(mimeType: string): boolean {
  return SUPPORTED_MIME_TYPES.includes(mimeType)
}

/**
 * Validate file size
 */
export function isValidFileSize(size: number): boolean {
  return size > 0 && size <= MAX_FILE_SIZE
}

/**
 * Validate file for upload
 */
export function validateFile(file: File): { valid: boolean; error?: string } {
  if (!isValidFileType(file.type)) {
    return { 
      valid: false, 
      error: `Unsupported file type: ${file.type}. Supported types: PDF, JPEG, PNG, WebP, GIF` 
    }
  }
  
  if (!isValidFileSize(file.size)) {
    const sizeMB = (file.size / 1024 / 1024).toFixed(2)
    return { 
      valid: false, 
      error: `File too large: ${sizeMB}MB. Maximum size: 20MB` 
    }
  }
  
  return { valid: true }
}

/**
 * Validate JSON string
 */
export function isValidJson(str: string): boolean {
  try {
    JSON.parse(str)
    return true
  } catch {
    return false
  }
}

/**
 * Validate JSON against a schema (basic implementation)
 * TODO: Implement full JSON Schema validation using ajv or similar
 */
export function validateJsonSchema(
  data: unknown, 
  _schema: object
): { valid: boolean; errors?: string[] } {
  // Basic check - just verify it's an object
  if (typeof data !== 'object' || data === null) {
    return { valid: false, errors: ['Data must be an object'] }
  }
  
  // TODO: Implement full schema validation
  return { valid: true }
}

/**
 * Validate temperature parameter
 */
export function isValidTemperature(temp: number): boolean {
  return temp >= 0 && temp <= 2
}

/**
 * Validate context window size
 */
export function isValidContextSize(size: number): boolean {
  return size >= 512 && size <= 131072
}

/**
 * Validate max tokens
 */
export function isValidMaxTokens(tokens: number): boolean {
  return tokens >= 1 && tokens <= 32768
}
